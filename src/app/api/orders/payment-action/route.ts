import { NextResponse } from "next/server"
import { z } from "zod"
import { POST as postBankTransferAction } from "@/app/api/orders/bank-transfer/route"
import { POST as postStripeCancel } from "@/app/api/orders/cancel/route"
import { POST as postStripeReturn } from "@/app/api/orders/return/route"
import { POST as postPrzelewy24Return } from "@/app/api/orders/przelewy24-return/route"
import { PUT as putOrder } from "@/app/api/orders/route"
import { authorizeAPI } from "@/lib/authUtils"
import { buildAdminOrderStateToken } from "@/lib/orderAdminState"
import {
  PAYMENT_ADMIN_ACTIONS,
  classifyPaymentAdminActionPrecondition,
  listAvailablePaymentAdminActions,
  resolvePaymentAdminActionTarget,
} from "@/lib/paymentAdminActions"
import {
  describeOrderPaymentLifecycle,
  resolveOrderPaymentProvider,
  type PaymentProviderOrderIdentity,
} from "@/lib/paymentProviders"
import { initializeMockData } from "@/store/serverStore"

const PaymentAdminActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(PAYMENT_ADMIN_ACTIONS),
  expectedStateToken: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
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

function describeAdminPaymentOrder(order: IdentifiablePaymentOrder) {
  return {
    ...order,
    adminStateToken: buildAdminOrderStateToken(order),
    paymentLifecycle: describeOrderPaymentLifecycle(order),
    paymentAdminActions: listAvailablePaymentAdminActions(order),
  }
}

function replayPaymentAdminAction(order: IdentifiablePaymentOrder) {
  return NextResponse.json(
    {
      success: true,
      replayed: true,
      order: describeAdminPaymentOrder(order),
    },
    {
      headers: { "Idempotency-Replayed": "true" },
    }
  )
}

async function withFreshPaymentOrder(
  response: Response,
  orderId: string
) {
  const payload = await response.json().catch(() => null)

  if (!response.ok && response.status !== 202) {
    return NextResponse.json(
      payload ?? { error: "Operacja płatnicza nie powiodła się." },
      { status: response.status }
    )
  }

  const snapshot = initializeMockData()
  const order = (snapshot.orders as IdentifiablePaymentOrder[]).find(
    (candidate) => candidate.id === orderId
  )
  if (!order) {
    return NextResponse.json(payload ?? {}, { status: response.status })
  }

  const body =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : { result: payload }

  return NextResponse.json(
    {
      ...body,
      order: describeAdminPaymentOrder(order),
    },
    { status: response.status }
  )
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

  if (parsed.data.expectedStateToken === undefined) {
    return NextResponse.json(
      {
        error:
          "Operacja płatnicza wymaga expectedStateToken z ostatniego odczytu zamówienia.",
      },
      { status: 428 }
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

  const precondition = classifyPaymentAdminActionPrecondition(
    order,
    parsed.data.action,
    parsed.data.expectedStateToken
  )
  if (precondition === "replay") {
    return replayPaymentAdminAction(order)
  }
  if (precondition === "conflict") {
    return NextResponse.json(
      {
        error:
          "Stan zamówienia zmienił się od ostatniego odczytu. Odśwież dane i ponów operację płatniczą.",
        code: "PAYMENT_ADMIN_STATE_CONFLICT",
      },
      { status: 409 }
    )
  }

  const provider = resolveOrderPaymentProvider(order)
  if (!provider) {
    return NextResponse.json(
      { error: "Nie można bezpiecznie ustalić operatora płatności." },
      { status: 409 }
    )
  }

  const availableActions = listAvailablePaymentAdminActions(order)
  if (!availableActions.includes(parsed.data.action)) {
    return NextResponse.json(
      {
        error:
          "Ta operacja płatnicza nie jest dostępna dla aktualnego stanu zamówienia.",
      },
      { status: 409 }
    )
  }

  try {
    const target = resolvePaymentAdminActionTarget(provider, parsed.data.action)

    let response: Response

    switch (target.handler) {
      case "STRIPE_CANCEL":
        response = await postStripeCancel(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            expectedStateToken: parsed.data.expectedStateToken,
          })
        )
        break
      case "STRIPE_RETURN":
        response = await postStripeReturn(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            action: target.action,
            expectedStateToken: parsed.data.expectedStateToken,
          })
        )
        break
      case "PRZELEWY24_RETURN":
        response = await postPrzelewy24Return(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            action: target.action,
            expectedStateToken: parsed.data.expectedStateToken,
          })
        )
        break
      case "BANK_TRANSFER":
        response = await postBankTransferAction(
          forwardedRequest(req, "POST", {
            id: parsed.data.id,
            action: target.action,
            expectedStateToken: parsed.data.expectedStateToken,
          })
        )
        break
      case "ORDER_CANCEL":
        response = await putOrder(
          forwardedRequest(req, "PUT", {
            id: parsed.data.id,
            expectedStateToken: buildAdminOrderStateToken(order),
            status: "CANCELLED",
          })
        )
        break
    }

    return withFreshPaymentOrder(response, parsed.data.id)
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
