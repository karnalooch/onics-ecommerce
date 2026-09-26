import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  applyExpiredCheckoutCancellation,
  applyStripeRefundSnapshot,
  type StripeCancelableOrder,
  type StripeRefundStatus,
} from "@/lib/refunds"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
} from "@/lib/paymentProviders"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const CancelOrderSchema = z.object({
  id: z.string().min(1),
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

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Płatności Stripe nie są skonfigurowane." },
      { status: 503 }
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

      const refund = order.stripeRefundId
        ? await stripe.refunds.retrieve(order.stripeRefundId)
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
    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }
    if (
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
