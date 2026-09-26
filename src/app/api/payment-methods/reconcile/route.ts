import { NextResponse } from "next/server"
import { z } from "zod"
import { POST as postPrzelewy24Reconcile } from "@/app/api/payment-methods/reconcile/przelewy24/route"
import { POST as postStripeReconcile } from "@/app/api/payment-methods/reconcile/stripe/route"
import {
  PAYMENT_PROVIDER_IDS,
  supportsPaymentProviderCapability,
  type PaymentProviderId,
} from "@/lib/paymentProviders"

const ReconcileSchema = z.object({
  provider: z.enum(PAYMENT_PROVIDER_IDS).default("STRIPE"),
  orderId: z.string().min(1).optional(),
})

type ReconcileHandler = (request: Request) => Promise<Response>

const handlers: Partial<Record<PaymentProviderId, ReconcileHandler>> = {
  STRIPE: postStripeReconcile,
  PRZELEWY24: postPrzelewy24Reconcile,
}

export async function POST(req: Request) {
  const parsed = ReconcileSchema.safeParse(
    await req.json().catch(() => ({}))
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie synchronizacji płatności." },
      { status: 400 }
    )
  }

  const provider = parsed.data.provider
  if (!supportsPaymentProviderCapability(provider, "reconcile")) {
    return NextResponse.json(
      { error: "Ten operator płatności nie obsługuje synchronizacji." },
      { status: 409 }
    )
  }

  const handler = handlers[provider]
  if (!handler) {
    return NextResponse.json(
      { error: "Brak bezpiecznego handlera synchronizacji dla operatora." },
      { status: 501 }
    )
  }

  return handler(
    new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({
        ...(parsed.data.orderId
          ? { orderId: parsed.data.orderId }
          : {}),
      }),
    })
  )
}
