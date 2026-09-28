import { NextResponse } from "next/server"
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
  assertPaymentProviderCapability,
  describeOrderPaymentLifecycle,
  resolveOrderPaymentProvider,
} from "@/lib/paymentProviders"
import {
  classifyPaymentAdminActionPrecondition,
  listAvailablePaymentAdminActions,
} from "@/lib/paymentAdminActions"
import {
  moneyToMinorUnits,
} from "@/lib/payments"
import {
  receivePrzelewy24Return,
  requestPrzelewy24Refund,
  requestPrzelewy24Return,
  resolvePrzelewy24Config,
  stagePrzelewy24Refund,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
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

const ActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["REQUEST", "RECEIVE"]),
  expectedStateToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  let parsed: ReturnType<typeof ActionSchema.safeParse>
  try {
    parsed = ActionSchema.safeParse(await readCommerceJson(req))
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie RMA Przelewy24 jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie RMA Przelewy24." },
        { status: 400 }
      )
    }
    throw error
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa operacja RMA Przelewy24." },
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

  if (parsed.data.action === "REQUEST") {
    try {
      const result = await mutateMockData((db) => {
        assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
        const order = (db.orders as Przelewy24StoredOrder[]).find(
          (candidate) => candidate.id === parsed.data.id
        )
        if (!order) throw new Error("ORDER_NOT_FOUND")

        const precondition = classifyPaymentAdminActionPrecondition(
          order,
          "REQUEST_RETURN",
          expectedStateToken
        )
        if (precondition === "replay") {
          return { order, outcome: "unchanged" as const, replayed: true }
        }
        if (precondition === "conflict") {
          throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
        }

        const provider = resolveOrderPaymentProvider(order)
        if (provider !== "PRZELEWY24") {
          throw new Error("PRZELEWY24_REQUIRED")
        }
        assertPaymentProviderCapability(provider, "rma")

        const outcome = requestPrzelewy24Return(order)
        return { order, outcome, replayed: false }
      })

      return NextResponse.json(
        {
          success: true,
          replayed: result.replayed,
          outcome: result.outcome,
          order: {
            ...result.order,
            paymentLifecycle: describeOrderPaymentLifecycle(result.order),
            paymentAdminActions: listAvailablePaymentAdminActions(result.order),
          },
        },
        result.replayed
          ? { headers: { "Idempotency-Replayed": "true" } }
          : undefined
      )
    } catch (error) {
      return paymentError(error)
    }
  }

  const preflight = initializeMockData()
  const preflightOrder = (preflight.orders as Przelewy24StoredOrder[]).find(
    (candidate) => candidate.id === parsed.data.id
  )
  if (!preflightOrder) {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia." },
      { status: 404 }
    )
  }

  const preflightState = classifyPaymentAdminActionPrecondition(
    preflightOrder,
    "RECEIVE_RETURN",
    expectedStateToken
  )
  if (preflightState === "replay") {
    return NextResponse.json(
      {
        success: true,
        replayed: true,
        order: {
          ...preflightOrder,
          paymentLifecycle: describeOrderPaymentLifecycle(preflightOrder),
          paymentAdminActions: listAvailablePaymentAdminActions(preflightOrder),
        },
      },
      { headers: { "Idempotency-Replayed": "true" } }
    )
  }
  if (preflightState === "conflict") {
    return paymentError(new Error("PAYMENT_ADMIN_STATE_CONFLICT"))
  }

  let config: ReturnType<typeof resolvePrzelewy24Config>
  try {
    config = resolvePrzelewy24Config()
  } catch {
    return NextResponse.json(
      { error: "Przelewy24 nie jest skonfigurowane." },
      { status: 503 }
    )
  }

  try {
    const intent = await mutateMockData((db) => {
      assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)
      const order = (db.orders as Przelewy24StoredOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      const precondition = classifyPaymentAdminActionPrecondition(
        order,
        "RECEIVE_RETURN",
        expectedStateToken
      )
      if (precondition === "replay") {
        return { replayed: true as const, order }
      }
      if (precondition === "conflict") {
        throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
      }

      const provider = resolveOrderPaymentProvider(order)
      if (provider !== "PRZELEWY24") {
        throw new Error("PRZELEWY24_REQUIRED")
      }
      assertPaymentProviderCapability(provider, "rma")
      assertPaymentProviderCapability(provider, "refund")

      receivePrzelewy24Return(order)
      const staged = stagePrzelewy24Refund(order)

      if (!order.p24OrderId || !order.p24SessionId) {
        throw new Error("PRZELEWY24_REFUND_IDENTITY_MISSING")
      }

      return {
        replayed: false as const,
        orderId: order.p24OrderId,
        sessionId: order.p24SessionId,
        amount: moneyToMinorUnits(Number(order.totalPriceFinal ?? 0)),
        requestId: staged.requestId,
        refundsUuid: staged.refundsUuid,
      }
    })

    if (intent.replayed) {
      return NextResponse.json(
        {
          success: true,
          replayed: true,
          order: {
            ...intent.order,
            paymentLifecycle: describeOrderPaymentLifecycle(intent.order),
            paymentAdminActions: listAvailablePaymentAdminActions(intent.order),
          },
        },
        { headers: { "Idempotency-Replayed": "true" } }
      )
    }

    await requestPrzelewy24Refund(config, {
      orderId: intent.orderId,
      sessionId: intent.sessionId,
      amount: intent.amount,
      requestId: intent.requestId,
      refundsUuid: intent.refundsUuid,
      description: "Zwrot zamowienia ONICS",
    })

    const snapshot = initializeMockData()
    const order = (snapshot.orders as Przelewy24StoredOrder[]).find(
      (candidate) => candidate.id === parsed.data.id
    )

    return NextResponse.json(
      {
        success: false,
        pending: true,
        order: order
          ? {
              ...order,
              paymentLifecycle: describeOrderPaymentLifecycle(order),
              paymentAdminActions: listAvailablePaymentAdminActions(order),
            }
          : null,
      },
      { status: 202 }
    )
  } catch (error) {
    return paymentError(error, true)
  }
}

function paymentError(error: unknown, external = false) {
  const code = error instanceof Error ? error.message : ""

  if (code === "ADMIN_ACCESS_REVOKED") {
    return NextResponse.json(
      { error: "Uprawnienia administratora zmieniły się przed operacją RMA Przelewy24." },
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
    PRZELEWY24_REQUIRED:
      "To zamówienie nie korzysta z Przelewy24.",
    PRZELEWY24_RETURN_INVALID_ORDER_STATUS:
      "RMA Przelewy24 można prowadzić tylko dla wysłanego zamówienia.",
    PRZELEWY24_RETURN_PAYMENT_REQUIRED:
      "RMA Przelewy24 wymaga opłaconego zamówienia.",
    PRZELEWY24_RETURN_INVALID_STATE:
      "Stan RMA Przelewy24 nie pozwala na tę operację.",
    PRZELEWY24_RETURN_NOT_REQUESTED:
      "Najpierw otwórz RMA, zanim potwierdzisz odbiór towaru.",
    PRZELEWY24_RETURN_NOT_RECEIVED:
      "Najpierw potwierdź fizyczny odbiór towaru.",
    PRZELEWY24_REFUND_REQUIRES_PAID:
      "Refund Przelewy24 wymaga opłaconego zamówienia.",
    PRZELEWY24_REFUND_IDENTITY_MISSING:
      "Brak identyfikatorów transakcji potrzebnych do refundu Przelewy24.",
    PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED:
      "Ten operator płatności nie obsługuje wymaganej operacji.",
  }

  if (code in conflicts) {
    return NextResponse.json(
      { error: conflicts[code] },
      { status: 409 }
    )
  }

  console.error("Przelewy24 RMA/refund error:", error)
  return NextResponse.json(
    {
      error: external
        ? "Nie udało się zlecić refundu Przelewy24. Stan oczekującego refundu został zachowany i operację można bezpiecznie ponowić."
        : "Nie udało się bezpiecznie obsłużyć RMA Przelewy24.",
    },
    { status: 502 }
  )
}
