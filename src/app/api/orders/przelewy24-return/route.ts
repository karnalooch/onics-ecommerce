import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  assertPaymentProviderCapability,
  describeOrderPaymentLifecycle,
  resolveOrderPaymentProvider,
} from "@/lib/paymentProviders"
import { listAvailablePaymentAdminActions } from "@/lib/paymentAdminActions"
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

const ActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["REQUEST", "RECEIVE"]),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = ActionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa operacja RMA Przelewy24." },
      { status: 400 }
    )
  }

  if (parsed.data.action === "REQUEST") {
    try {
      const result = await mutateMockData((db) => {
        const order = (db.orders as Przelewy24StoredOrder[]).find(
          (candidate) => candidate.id === parsed.data.id
        )
        if (!order) throw new Error("ORDER_NOT_FOUND")

        const provider = resolveOrderPaymentProvider(order)
        if (provider !== "PRZELEWY24") {
          throw new Error("PRZELEWY24_REQUIRED")
        }
        assertPaymentProviderCapability(provider, "rma")

        const outcome = requestPrzelewy24Return(order)
        return { order, outcome }
      })

      return NextResponse.json({
        success: true,
        outcome: result.outcome,
        order: {
          ...result.order,
          paymentLifecycle: describeOrderPaymentLifecycle(result.order),
          paymentAdminActions: listAvailablePaymentAdminActions(result.order),
        },
      })
    } catch (error) {
      return paymentError(error)
    }
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
      const order = (db.orders as Przelewy24StoredOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

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
        orderId: order.p24OrderId,
        sessionId: order.p24SessionId,
        amount: moneyToMinorUnits(Number(order.totalPriceFinal ?? 0)),
        requestId: staged.requestId,
        refundsUuid: staged.refundsUuid,
      }
    })

    await requestPrzelewy24Refund(config, {
      ...intent,
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

  if (code === "ORDER_NOT_FOUND") {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia." },
      { status: 404 }
    )
  }

  const conflicts: Record<string, string> = {
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
