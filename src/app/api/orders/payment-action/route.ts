import { NextResponse } from "next/server"
import { z } from "zod"
import { POST as postBankTransferAction } from "@/app/api/orders/bank-transfer/route"
import { POST as postStripeCancel } from "@/app/api/orders/cancel/route"
import { POST as postStripeReturn } from "@/app/api/orders/return/route"
import { PUT as putOrder } from "@/app/api/orders/route"
import { authorizeAPI } from "@/lib/authUtils"
import {
  PAYMENT_ADMIN_ACTIONS,
  resolvePaymentAdminActionTarget,
} from "@/lib/paymentAdminActions"
import {
  resolveOrderPaymentProvider,
  type PaymentProviderOrderIdentity,
} from "@/lib/paymentProviders"
import { initializeMockData } from "@/store/serverStore"

const PaymentAdminActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(PAYMENT_ADMIN_ACTIONS),
})

type IdentifiablePaymentOrder = PaymentProviderOrderIdentity & {
  id?: unknown
}

function forwardedRequest(
  request: Request,
  method: "POST" | "PUT",
  body: Record<string, unknown>
) {
  return new Request(request.url, {
    method,
    headers: request.headers,
    body: JSON.stringify(body),
  })
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = PaymentAdminActionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa operacja płatnicza." },
      { status: 400 }
    )
  }

  const snapshot = initializeMockData()
  const order = (snapshot.orders as IdentifiablePaymentOrder[]).find(
    (candidate) => candidate.id === parsed.data.id
  )
  if (!order) {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia." },
      { status: 404 }
    )
  }

  const provider = resolveOrderPaymentProvider(order)
  if (!provider) {
    return NextResponse.json(
      { error: "Nie można bezpiecznie ustalić operatora płatności." },
      { status: 409 }
    )
  }

  try {
    const target = resolvePaymentAdminActionTarget(provider, parsed.data.action)

    switch (target.handler) {
      case "STRIPE_CANCEL":
        return postStripeCancel(
          forwardedRequest(req, "POST", { id: parsed.data.id })
        )
      case "STRIPE_RETURN":
        return postStripeReturn(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            action: target.action,
          })
        )
      case "BANK_TRANSFER":
        return postBankTransferAction(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            action: target.action,
          })
        )
      case "ORDER_CANCEL":
        return putOrder(
          forwardedRequest(req, "PUT", {
            id: parsed.data.id,
            status: "CANCELLED",
          })
        )
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (
      code === "PAYMENT_ADMIN_ACTION_UNSUPPORTED" ||
      code === "PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED"
    ) {
      return NextResponse.json(
        {
          error:
            "Ten operator płatności nie obsługuje wymaganej operacji administracyjnej.",
        },
        { status: 409 }
      )
    }

    console.error("Payment admin action dispatch error:", error)
    return NextResponse.json(
      { error: "Nie udało się bezpiecznie wykonać operacji płatniczej." },
      { status: 500 }
    )
  }
}
