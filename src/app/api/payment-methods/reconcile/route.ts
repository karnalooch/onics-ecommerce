import { NextResponse } from "next/server"
import { z } from "zod"
import { POST as postPrzelewy24Reconcile } from "@/app/api/payment-methods/reconcile/przelewy24/route"
import { POST as postStripeReconcile } from "@/app/api/payment-methods/reconcile/stripe/route"
import { authorizeAPI } from "@/lib/authUtils"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
import {
  PAYMENT_PROVIDER_IDS,
  supportsPaymentProviderCapability,
  type PaymentProviderId,
} from "@/lib/paymentProviders"

const ReconcileSchema = z.union([
  z
    .object({
      provider: z.enum(PAYMENT_PROVIDER_IDS).default("STRIPE"),
      orderId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      provider: z.enum(PAYMENT_PROVIDER_IDS).default("STRIPE"),
      scope: z.literal("bulk"),
    })
    .strict(),
])

type ReconcileHandler = (request: Request) => Promise<Response>

const handlers: Partial<Record<PaymentProviderId, ReconcileHandler>> = {
  STRIPE: postStripeReconcile,
  PRZELEWY24: postPrzelewy24Reconcile,
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  let parsed: ReturnType<typeof ReconcileSchema.safeParse>
  try {
    parsed = ReconcileSchema.safeParse(await readCommerceJson(req))
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie synchronizacji płatności jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie synchronizacji płatności." },
        { status: 400 }
      )
    }
    throw error
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie synchronizacji płatności." },
      { status: 400 }
    )
  }

  const provider = parsed.data.provider
  const orderId = "orderId" in parsed.data ? parsed.data.orderId : undefined
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
      body: JSON.stringify(
        orderId ? { orderId } : { scope: "bulk" }
      ),
    })
  )
}
