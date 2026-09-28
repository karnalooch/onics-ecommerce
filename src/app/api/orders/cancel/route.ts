import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { hasAccountRoleAccess } from "@/lib/accountAccess"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  applyExpiredCheckoutCancellation,
  applyStripeRefundSnapshot,
  stageStripeRefundIntent,
  type StripeCancelableOrder,
  type StripeRefundStatus,
} from "@/lib/refunds"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
} from "@/lib/paymentProviders"
import { classifyPaymentAdminActionPrecondition } from "@/lib/paymentAdminActions"
import { buildAdminOrderStateToken } from "@/lib/orderAdminState"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

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

const CancelOrderSchema = z.object({
  id: z.string().min(1),
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

  const parsed = CancelOrderSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe zamówienie." },
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

  const snapshot = initializeMockData()
  const order = (snapshot.orders as StripeCancelableOrder[]).find(
    (candidate) => candidate.id === parsed.data.id
  )

  if (!order) {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia." },
      { status: 404 }
    )
  }

  const precondition = classifyPaymentAdminActionPrecondition(
    order,
    "CANCEL",
    expectedStateToken
  )
  if (precondition === "replay") {
    return NextResponse.json(
      {
        success: true,
        replayed: true,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundStatus: order.refundStatus ?? null,
      },
      { headers: { "Idempotency-Replayed": "true" } }
    )
  }
  if (precondition === "conflict") {
    return NextResponse.json(
      {
        error:
          "Stan zamówienia zmienił się od ostatniego odczytu. Odśwież dane i ponów anulowanie.",
        code: "PAYMENT_ADMIN_STATE_CONFLICT",
      },
      { status: 409 }
    )
  }

  const provider = resolveOrderPaymentProvider(order)
  if (
    provider !== "STRIPE" ||
    !supportsPaymentProviderCapability(provider, "cancel") ||
    !order.stripeCheckoutSessionId
  ) {
    return NextResponse.json(
      { error: "To zamówienie nie jest powiązane z płatnością Stripe." },
      { status: 409 }
    )
  }

  if (order.status === "SHIPPED") {
    return NextResponse.json(
      {
        error:
          "Wysłanego zamówienia nie można automatycznie anulować i zwrócić na stan. Wymagany jest osobny proces zwrotu towaru.",
      },
      { status: 409 }
    )
  }

  if (
    order.status === "CANCELLED" &&
    (order.paymentStatus === "REFUNDED" || order.paymentStatus === "EXPIRED")
  ) {
    return NextResponse.json({
      success: true,
      status: order.status,
      paymentStatus: order.paymentStatus,
      refundStatus: order.refundStatus ?? null,
    })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Płatności Stripe nie są skonfigurowane." },
      { status: 503 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeCheckoutSessionId
    )
    const isPaid =
      order.paymentStatus === "PAID" || session.payment_status === "paid"

    if (isPaid) {
      if (!supportsPaymentProviderCapability(provider, "refund")) {
        return NextResponse.json(
          { error: "Ten operator płatności nie obsługuje automatycznego zwrotu." },
          { status: 409 }
        )
      }

      const intentId =
        order.stripePaymentIntentId || paymentIntentId(session)
      if (!intentId) {
        return NextResponse.json(
          {
            error:
              "Nie można ustalić PaymentIntent dla opłaconego zamówienia.",
          },
          { status: 409 }
        )
      }

      const staged = await mutateMockData((db) => {
        assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
        const fresh = (db.orders as StripeCancelableOrder[]).find(
          (candidate) => candidate.id === order.id
        )
        if (!fresh) throw new Error("ORDER_NOT_FOUND")
        if (
          fresh.stripeCheckoutSessionId !== order.stripeCheckoutSessionId
        ) {
          throw new Error("STRIPE_ORDER_CHANGED")
        }

        const stagePrecondition = classifyPaymentAdminActionPrecondition(
          fresh,
          "CANCEL",
          expectedStateToken
        )
        if (stagePrecondition === "replay") {
          return {
            order: fresh,
            replayed: true as const,
            stateToken: buildAdminOrderStateToken(fresh),
          }
        }
        if (stagePrecondition === "conflict") {
          throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
        }

        fresh.stripePaymentIntentId =
          fresh.stripePaymentIntentId ?? intentId
        stageStripeRefundIntent(fresh)
        return {
          order: fresh,
          replayed: false as const,
          stateToken: buildAdminOrderStateToken(fresh),
        }
      })

      if (staged.replayed) {
        return NextResponse.json(
          {
            success: true,
            replayed: true,
            status: staged.order.status,
            paymentStatus: staged.order.paymentStatus,
            refundStatus: staged.order.refundStatus ?? null,
          },
          { headers: { "Idempotency-Replayed": "true" } }
        )
      }

      const refund = staged.order.stripeRefundId
        ? await stripe.refunds.retrieve(staged.order.stripeRefundId)
        : await stripe.refunds.create(
            {
              payment_intent: intentId,
              reason: "requested_by_customer",
              metadata: {
                order_id: order.id,
              },
            },
            {
              idempotencyKey: `onics-order-refund:${order.id}`,
            }
          )

      const status = refundStatus(refund.status)
      const updated = await mutateMockData((db) => {
        const fresh = (db.orders as StripeCancelableOrder[]).find(
          (candidate) => candidate.id === order.id
        )
        if (!fresh) throw new Error("ORDER_NOT_FOUND")
        if (
          fresh.stripeCheckoutSessionId !== order.stripeCheckoutSessionId
        ) {
          throw new Error("STRIPE_ORDER_CHANGED")
        }
        const freshPrecondition = classifyPaymentAdminActionPrecondition(
          fresh,
          "CANCEL",
          staged.stateToken
        )
        if (
          freshPrecondition === "conflict" &&
          fresh.stripeRefundId !== refund.id
        ) {
          throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
        }
        if (freshPrecondition === "replay") {
          return fresh
        }

        applyStripeRefundSnapshot(
          db.products as InventoryProduct[],
          fresh,
          {
            orderId: refund.metadata?.order_id || order.id,
            refundId: refund.id,
            paymentIntentId: refundPaymentIntentId(refund) || intentId,
            amount: refund.amount,
            currency: refund.currency,
            status,
          }
        )
        return fresh
      })

      const response = {
        success: status === "succeeded",
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        refundStatus: updated.refundStatus,
        refundId: updated.stripeRefundId,
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
            "Refund Stripe nie zakończył się powodzeniem. Zamówienie pozostaje opłacone.",
        },
        { status: 409 }
      )
    }

    if (session.status === "complete") {
      return NextResponse.json(
        {
          error:
            "Sesja Stripe jest zakończona, ale płatność nie ma jeszcze stanu PAID. Poczekaj na rozliczenie webhooka przed anulowaniem.",
        },
        { status: 409 }
      )
    }

    const cancelPreflight = await mutateMockData((db) => {
      assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
      const fresh = (db.orders as StripeCancelableOrder[]).find(
        (candidate) => candidate.id === order.id
      )
      if (!fresh) throw new Error("ORDER_NOT_FOUND")
      if (fresh.stripeCheckoutSessionId !== session.id) {
        throw new Error("STRIPE_ORDER_CHANGED")
      }

      const freshPrecondition = classifyPaymentAdminActionPrecondition(
        fresh,
        "CANCEL",
        expectedStateToken
      )
      if (freshPrecondition === "conflict") {
        throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
      }

      return {
        order: fresh,
        replayed: freshPrecondition === "replay",
      }
    })

    if (cancelPreflight.replayed) {
      return NextResponse.json(
        {
          success: true,
          replayed: true,
          status: cancelPreflight.order.status,
          paymentStatus: cancelPreflight.order.paymentStatus,
          refundStatus: cancelPreflight.order.refundStatus ?? null,
        },
        { headers: { "Idempotency-Replayed": "true" } }
      )
    }

    if (session.status === "open") {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireError) {
        const refreshed = await stripe.checkout.sessions.retrieve(session.id)
        if (refreshed.status !== "expired") throw expireError
      }
    } else if (session.status !== "expired") {
      return NextResponse.json(
        { error: "Sesja Stripe nie może być teraz bezpiecznie anulowana." },
        { status: 409 }
      )
    }

    const updated = await mutateMockData((db) => {
      const fresh = (db.orders as StripeCancelableOrder[]).find(
        (candidate) => candidate.id === order.id
      )
      if (!fresh) throw new Error("ORDER_NOT_FOUND")
      if (fresh.stripeCheckoutSessionId !== session.id) {
        throw new Error("STRIPE_ORDER_CHANGED")
      }
      const freshPrecondition = classifyPaymentAdminActionPrecondition(
        fresh,
        "CANCEL",
        expectedStateToken
      )
      if (freshPrecondition === "conflict") {
        throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
      }
      if (freshPrecondition === "replay") {
        return fresh
      }

      applyExpiredCheckoutCancellation(
        db.products as InventoryProduct[],
        fresh
      )
      return fresh
    })

    return NextResponse.json({
      success: true,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
    })
  } catch (error) {
    console.error("Stripe order cancellation error:", error)

    const code = error instanceof Error ? error.message : ""
    if (code === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed anulowaniem płatności." },
        { status: 403 }
      )
    }
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }
    if (
      code === "PAYMENT_ADMIN_STATE_CONFLICT" ||
      code === "STRIPE_ORDER_CHANGED" ||
      code === "STRIPE_CANCEL_PAYMENT_ALREADY_FINAL" ||
      code === "STRIPE_REFUND_ID_MISMATCH" ||
      code === "INVENTORY_REFUND_INVALID_STATE"
    ) {
      return NextResponse.json(
        {
          error:
            "Stan zamówienia zmienił się podczas anulowania. Odśwież dane i spróbuj ponownie.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się bezpiecznie anulować zamówienia Stripe." },
      { status: 502 }
    )
  }
}
