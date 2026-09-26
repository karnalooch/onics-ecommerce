import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  applyStripeRefundSnapshot,
  type StripeRefundStatus,
} from "@/lib/refunds"
import {
  receiveShippedReturn,
  requestShippedReturn,
  type StripeReturnOrder,
} from "@/lib/returns"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const ReturnOrderSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["REQUEST", "RECEIVE"]),
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

function findOrder(id: string) {
  const snapshot = initializeMockData()
  return (snapshot.orders as StripeReturnOrder[]).find(
    (candidate) => candidate.id === id
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = ReturnOrderSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe żądanie RMA." },
      { status: 400 }
    )
  }

  try {
    if (parsed.data.action === "REQUEST") {
      const updated = await mutateMockData((db) => {
        const order = (db.orders as StripeReturnOrder[]).find(
          (candidate) => candidate.id === parsed.data.id
        )
        if (!order) throw new Error("ORDER_NOT_FOUND")

        requestShippedReturn(order)
        return order
      })

      return NextResponse.json({
        success: true,
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        returnStatus: updated.returnStatus,
      })
    }

    const received = await mutateMockData((db) => {
      const order = (db.orders as StripeReturnOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      receiveShippedReturn(
        db.products as InventoryProduct[],
        order
      )
      return order
    })

    if (
      received.status === "RETURNED" &&
      received.returnStatus === "COMPLETED"
    ) {
      return NextResponse.json({
        success: true,
        status: received.status,
        paymentStatus: received.paymentStatus,
        returnStatus: received.returnStatus,
      })
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          error:
            "Towar oznaczono jako odebrany, ale Stripe nie jest skonfigurowany. Po konfiguracji ponów finalizację RMA.",
          returnStatus: received.returnStatus,
        },
        { status: 503 }
      )
    }

    if (!received.stripeCheckoutSessionId) {
      throw new Error("RETURN_STRIPE_REQUIRED")
    }

    const stripe = new Stripe(stripeSecretKey)
    let intentId = received.stripePaymentIntentId ?? null

    if (!intentId) {
      const session = await stripe.checkout.sessions.retrieve(
        received.stripeCheckoutSessionId
      )
      intentId = paymentIntentId(session)
    }

    if (!intentId) {
      throw new Error("RETURN_PAYMENT_INTENT_MISSING")
    }

    const previousRefundFailed =
      received.refundStatus === "failed" ||
      received.refundStatus === "canceled"

    const refund =
      received.stripeRefundId && !previousRefundFailed
        ? await stripe.refunds.retrieve(received.stripeRefundId)
        : await stripe.refunds.create(
            {
              payment_intent: intentId,
              reason: "requested_by_customer",
              metadata: {
                order_id: String(received.id),
                flow: "rma",
              },
            },
            {
              idempotencyKey: `onics-order-return-refund:${received.id}:${
                received.stripeRefundId || "initial"
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
        order.returnStatus !== "REFUND_PENDING"
      ) {
        throw new Error("RETURN_CHANGED")
      }

      applyStripeRefundSnapshot(
        db.products as InventoryProduct[],
        order,
        {
          orderId: refund.metadata?.order_id || String(order.id),
          refundId: refund.id,
          paymentIntentId: refundPaymentIntentId(refund) || intentId,
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
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }

    const conflicts: Record<string, string> = {
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
