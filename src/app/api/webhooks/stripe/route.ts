import { NextResponse } from "next/server"
import Stripe from "stripe"
import {
  nextPaymentStatus,
  verifyCheckoutPayment,
} from "@/lib/payments"
import { mutateMockData } from "@/store/serverStore"
import {
  applyStripeInventoryTransition,
  type InventoryProduct,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"

type StoredOrder = InventoryReservationOrder & {
  id: string
  totalPriceFinal?: number
  paymentStatus?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeLastEventId?: string | null
  paidAt?: string | null
  paymentUpdatedAt?: string | null
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent
  return session.payment_intent?.id ?? null
}

async function applyCheckoutStatus(
  eventId: string,
  session: Stripe.Checkout.Session,
  incomingStatus: "PAID" | "FAILED" | "EXPIRED"
) {
  return mutateMockData((db) => {
    const orderId = session.metadata?.order_id || null
    const order = (db.orders as StoredOrder[]).find(
      (candidate) =>
        (orderId && candidate.id === orderId) ||
        candidate.stripeCheckoutSessionId === session.id
    )

    if (!order) {
      throw new Error(`Nie znaleziono zamówienia dla sesji Stripe ${session.id}.`)
    }

    const verification = verifyCheckoutPayment(
      {
        id: order.id,
        totalPriceFinal: Number(order.totalPriceFinal ?? 0),
        stripeCheckoutSessionId: order.stripeCheckoutSessionId,
        paymentStatus: order.paymentStatus,
      },
      {
        orderId,
        sessionId: session.id,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
      }
    )

    if (!verification.ok) {
      throw new Error(verification.reason)
    }

    const paymentStatus = nextPaymentStatus(order.paymentStatus, incomingStatus)
    const alreadyApplied =
      order.paymentStatus === paymentStatus &&
      order.stripeLastEventId === eventId

    if (alreadyApplied) {
      return { order, duplicate: true }
    }

    applyStripeInventoryTransition(
      db.products as InventoryProduct[],
      order,
      paymentStatus,
      incomingStatus
    )

    order.paymentStatus = paymentStatus
    order.stripePaymentIntentId =
      getPaymentIntentId(session) || order.stripePaymentIntentId || null
    order.stripeLastEventId = eventId
    order.paymentUpdatedAt = new Date().toISOString()

    if (paymentStatus === "PAID" && !order.paidAt) {
      order.paidAt = new Date().toISOString()
    }

    return { order, duplicate: false }
  })
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook Stripe nie jest skonfigurowany." },
      { status: 503 }
    )
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json(
      { error: "Brak nagłówka stripe-signature." },
      { status: 400 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error("Nieprawidłowy podpis webhooka Stripe:", error)
    return NextResponse.json(
      { error: "Nieprawidłowy webhook Stripe." },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (session.payment_status === "paid") {
          await applyCheckoutStatus(event.id, session, "PAID")
        }
        break
      }
      case "checkout.session.async_payment_succeeded": {
        await applyCheckoutStatus(event.id, event.data.object, "PAID")
        break
      }
      case "checkout.session.async_payment_failed": {
        await applyCheckoutStatus(event.id, event.data.object, "FAILED")
        break
      }
      case "checkout.session.expired": {
        await applyCheckoutStatus(event.id, event.data.object, "EXPIRED")
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Błąd obsługi webhooka Stripe:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się przetworzyć webhooka Stripe.",
      },
      { status: 500 }
    )
  }
}
