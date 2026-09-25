import { NextResponse } from "next/server"
import Stripe from "stripe"

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

  try {
    const stripe = new Stripe(stripeSecretKey)
    const rawBody = await req.text()
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        console.info("Stripe checkout completed", {
          id: session.id,
          clientReferenceId: session.client_reference_id,
          paymentStatus: session.payment_status,
        })
        break
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object
        console.info("Stripe payment intent succeeded", {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        })
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Błąd Webhooka Stripe:", error)
    return NextResponse.json(
      { error: "Nieprawidłowy webhook Stripe." },
      { status: 400 }
    )
  }
}
