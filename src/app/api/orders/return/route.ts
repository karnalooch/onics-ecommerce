import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  applyStripeRefundSnapshot,
  stageStripeRefundIntent,
  type StripeRefundStatus,
} from "@/lib/refunds"
import {
  receiveShippedReturn,
  requestShippedReturn,
  type StripeReturnOrder,
} from "@/lib/returns"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  assertPaymentProviderCapability,
  resolveOrderPaymentProvider,
} from "@/lib/paymentProviders"
import { classifyPaymentAdminActionPrecondition } from "@/lib/paymentAdminActions"
import { buildAdminOrderStateToken } from "@/lib/orderAdminState"
import { mutateMockData } from "@/store/serverStore"

type StoredActor = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

function assertCurrentAdminAccess(
  users: StoredActor[],
  actor: { id?: string; email?: string | null }
) {
  const currentActor = findStoredUserBySession(users, actor)
  if (
    !currentActor ||
    !hasAccountRoleAccess(currentActor, ["ADMIN"])
  ) {
    throw new Error("ADMIN_ACCESS_REVOKED")
  }
}

const ReturnOrderSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["REQUEST", "RECEIVE"]),
  expectedStateToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
})

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent
  return session.payment_intent?.id ?? null
}

function refundPaymentIntentId(refund: Stripe.Refund) {
  const value = (
    refund as Stripe.Refund & {
      payment_intent?: string | { id?: string } | null
    }
  ).payment_intent

  if (typeof value === "string") return value
  return value?.id ?? null
}

function refundStatus(value: unknown): StripeRefundStatus {
  if (
    value === "pending" ||
    value === "requires_action" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "canceled"
  ) {
    return value
  }
  throw new Error("STRIPE_REFUND_UNKNOWN_STATUS")
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  let parsed: ReturnType<typeof ReturnOrderSchema.safeParse>
  try {
    parsed = ReturnOrderSchema.safeParse(await readCommerceJson(req))
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie RMA Stripe jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie RMA Stripe." },
        { status: 400 }
      )
    }
    throw error
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe żądanie RMA." },
      { status: 400 }
    )
  }

  const expectedStateToken = parsed.data.expectedStateToken

  if (expectedStateToken === undefined) {
    return NextResponse.json(
      {
        error:
          "Operacja płatnicza wymaga expectedStateToken z ostatniego odczytu zamówienia.",
      },
      { status: 428 }
    )
  }

  try {
    if (parsed.data.action === "REQUEST") {
      const updated = await mutateMockData((db) => {
        assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
        const order = (db.orders as StripeReturnOrder[]).find(
          (candidate) => candidate.id === parsed.data.id
        )
        if (!order) throw new Error("ORDER_NOT_FOUND")

        const precondition = classifyPaymentAdminActionPrecondition(
          order,
          "REQUEST_RETURN",
          expectedStateToken
        )
        if (precondition === "replay") {
          return { order, replayed: true }
        }
        if (precondition === "conflict") {
          throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
        }

        const provider = resolveOrderPaymentProvider(order)
        if (provider !== "STRIPE") throw new Error("RETURN_STRIPE_REQUIRED")
        assertPaymentProviderCapability(provider, "rma")

        requestShippedReturn(order)
        return { order, replayed: false }
      })

      return NextResponse.json(
        {
          success: true,
          replayed: updated.replayed,
          status: updated.order.status,
          paymentStatus: updated.order.paymentStatus,
          returnStatus: updated.order.returnStatus,
        },
        updated.replayed
          ? { headers: { "Idempotency-Replayed": "true" } }
          : undefined
      )
    }

    const received = await mutateMockData((db) => {
      assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
      const order = (db.orders as StripeReturnOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      const precondition = classifyPaymentAdminActionPrecondition(
        order,
        "RECEIVE_RETURN",
        expectedStateToken
      )
      if (precondition === "replay") {
        return { order, replayed: true }
      }
      if (precondition === "conflict") {
        throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
      }

      const provider = resolveOrderPaymentProvider(order)
      if (provider !== "STRIPE") throw new Error("RETURN_STRIPE_REQUIRED")
      assertPaymentProviderCapability(provider, "rma")

      receiveShippedReturn(
        db.products as InventoryProduct[],
        order
      )
      return { order, replayed: false }
    })

    if (received.replayed) {
      return NextResponse.json(
        {
          success: true,
          replayed: true,
          status: received.order.status,
          paymentStatus: received.order.paymentStatus,
          returnStatus: received.order.returnStatus,
        },
        { headers: { "Idempotency-Replayed": "true" } }
      )
    }

    if (
      received.order.status === "RETURNED" &&
      received.order.returnStatus === "COMPLETED"
    ) {
      return NextResponse.json({
        success: true,
        status: received.order.status,
        paymentStatus: received.order.paymentStatus,
        returnStatus: received.order.returnStatus,
      })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "Towar oznaczono jako odebrany, ale Stripe nie jest skonfigurowany. Po konfiguracji ponów finalizację RMA.",
          returnStatus: received.order.returnStatus,
        },
        { status: 503 }
      )
    }

    const provider = resolveOrderPaymentProvider(received.order)
    if (provider !== "STRIPE" || !received.order.stripeCheckoutSessionId) {
      throw new Error("RETURN_STRIPE_REQUIRED")
    }
    assertPaymentProviderCapability(provider, "refund")

    const stripe = new Stripe(stripeSecretKey)
    let intentId = received.order.stripePaymentIntentId ?? null

    if (!intentId) {
      const session = await stripe.checkout.sessions.retrieve(
        received.order.stripeCheckoutSessionId
      )
      intentId = paymentIntentId(session)
    }

    if (!intentId) {
      throw new Error("RETURN_PAYMENT_INTENT_MISSING")
    }
    const resolvedIntentId = intentId

    const staged = await mutateMockData((db) => {
      const order = (db.orders as StripeReturnOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      if (
        order.returnStatus !== "RECEIVED" &&
        order.returnStatus !== "REFUND_PENDING"
      ) {
        throw new Error("RETURN_CHANGED")
      }

      order.stripePaymentIntentId =
        order.stripePaymentIntentId ?? resolvedIntentId
      stageStripeRefundIntent(order)
      return {
        order,
        stateToken: buildAdminOrderStateToken(order),
      }
    })

    const previousRefundFailed =
      staged.order.refundStatus === "failed" ||
      staged.order.refundStatus === "canceled"

    const refund =
      staged.order.stripeRefundId && !previousRefundFailed
        ? await stripe.refunds.retrieve(staged.order.stripeRefundId)
        : await stripe.refunds.create(
            {
              payment_intent: resolvedIntentId,
              reason: "requested_by_customer",
              metadata: {
                order_id: String(staged.order.id),
                flow: "rma",
              },
            },
            {
              idempotencyKey: `onics-order-return-refund:${staged.order.id}:${
                staged.order.stripeRefundId || "initial"
              }`,
            }
          )

    const status = refundStatus(refund.status)
    const updated = await mutateMockData((db) => {
      const order = (db.orders as StripeReturnOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      if (
        order.returnStatus !== "RECEIVED" &&
        order.returnStatus !== "REFUND_PENDING" &&
        !(order.status === "RETURNED" && order.paymentStatus === "REFUNDED")
      ) {
        throw new Error("RETURN_CHANGED")
      }

      if (
        buildAdminOrderStateToken(order) !== staged.stateToken &&
        order.stripeRefundId !== refund.id &&
        !(order.status === "RETURNED" && order.paymentStatus === "REFUNDED")
      ) {
        throw new Error("RETURN_CHANGED")
      }

      applyStripeRefundSnapshot(
        db.products as InventoryProduct[],
        order,
        {
          orderId: refund.metadata?.order_id || String(order.id),
          refundId: refund.id,
          paymentIntentId: refundPaymentIntentId(refund) || resolvedIntentId,
          amount: refund.amount,
          currency: refund.currency,
          status,
        }
      )

      return order
    })

    const response = {
      success: status === "succeeded",
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      refundStatus: updated.refundStatus,
      refundId: updated.stripeRefundId,
      returnStatus: updated.returnStatus,
    }

    if (status === "succeeded") {
      return NextResponse.json(response)
    }
    if (status === "pending" || status === "requires_action") {
      return NextResponse.json(response, { status: 202 })
    }

    return NextResponse.json(
      {
        ...response,
        error:
          "Refund Stripe nie zakończył się powodzeniem. Towar pozostaje oznaczony jako odebrany i można ponowić finalizację RMA.",
      },
      { status: 409 }
    )
  } catch (error) {
    console.error("RMA order return error:", error)

    const code = error instanceof Error ? error.message : ""
    if (code === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed operacją RMA." },
        { status: 403 }
      )
    }

    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }

    const conflicts: Record<string, string> = {
      PAYMENT_ADMIN_STATE_CONFLICT:
        "Stan zamówienia zmienił się od ostatniego odczytu. Odśwież dane i ponów operację RMA.",
      RETURN_INVALID_ORDER_STATUS:
        "RMA można otworzyć tylko dla wysłanego zamówienia.",
      RETURN_STRIPE_REQUIRED:
        "Automatyczny RMA jest dostępny tylko dla zamówienia Stripe.",
      RETURN_PAYMENT_INVALID_STATE:
        "Stan płatności nie pozwala teraz bezpiecznie obsłużyć RMA.",
      RETURN_NOT_REQUESTED:
        "Najpierw otwórz RMA, zanim potwierdzisz odbiór towaru.",
      RETURN_CHANGED:
        "Stan RMA zmienił się podczas operacji. Odśwież dane i spróbuj ponownie.",
      RETURN_PAYMENT_INTENT_MISSING:
        "Nie można ustalić PaymentIntent dla tego zamówienia.",
      STRIPE_REFUND_ID_MISMATCH:
        "Refund Stripe nie pasuje do aktualnego cyklu RMA.",
      INVENTORY_REFUND_INVALID_STATE:
        "Stan magazynowy nie pozwala bezpiecznie rozliczyć zwrotu.",
      INVENTORY_REFUND_INVALID_SOURCE:
        "Źródło rezerwacji magazynowej nie pozwala rozliczyć tego zwrotu.",
      PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED:
        "Ten operator płatności nie obsługuje wymaganego etapu RMA.",
    }

    if (code in conflicts) {
      return NextResponse.json(
        { error: conflicts[code] },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się bezpiecznie obsłużyć RMA." },
      { status: 502 }
    )
  }
}
