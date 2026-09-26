import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  confirmBankTransferPayment,
  confirmBankTransferRefund,
  type BankTransferOrder,
} from "@/lib/manualPayments"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  confirmBankTransferReturnRefund,
  receiveBankTransferReturn,
  requestBankTransferReturn,
  type BankTransferReturnOrder,
} from "@/lib/manualReturns"
import {
  assertPaymentProviderCapability,
  resolveOrderPaymentProvider,
  type PaymentProviderCapability,
} from "@/lib/paymentProviders"
import { mutateMockData } from "@/store/serverStore"

const BankTransferActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum([
    "CONFIRM_PAYMENT",
    "CONFIRM_REFUND",
    "REQUEST_RETURN",
    "RECEIVE_RETURN",
    "CONFIRM_RETURN_REFUND",
  ]),
})

type BankTransferAction = z.infer<typeof BankTransferActionSchema>["action"]

function requiredCapabilities(
  action: BankTransferAction
): PaymentProviderCapability[] {
  switch (action) {
    case "CONFIRM_PAYMENT":
      return ["manualSettlement"]
    case "CONFIRM_REFUND":
      return ["cancel", "refund", "manualSettlement"]
    case "REQUEST_RETURN":
    case "RECEIVE_RETURN":
      return ["rma"]
    case "CONFIRM_RETURN_REFUND":
      return ["rma", "refund", "manualSettlement"]
  }
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = BankTransferActionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa operacja przelewu bankowego." },
      { status: 400 }
    )
  }

  try {
    const result = await mutateMockData((db) => {
      const order = (db.orders as BankTransferOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      const provider = resolveOrderPaymentProvider(order)
      if (provider !== "BANK_TRANSFER") {
        throw new Error("BANK_TRANSFER_REQUIRED")
      }
      for (const capability of requiredCapabilities(parsed.data.action)) {
        assertPaymentProviderCapability(provider, capability)
      }

      let outcome:
        | ReturnType<typeof confirmBankTransferPayment>
        | ReturnType<typeof confirmBankTransferRefund>
        | ReturnType<typeof requestBankTransferReturn>
        | ReturnType<typeof receiveBankTransferReturn>
        | ReturnType<typeof confirmBankTransferReturnRefund>

      switch (parsed.data.action) {
        case "CONFIRM_PAYMENT":
          outcome = confirmBankTransferPayment(
            order,
            authCheck.user
          )
          break
        case "CONFIRM_REFUND":
          outcome = confirmBankTransferRefund(
            db.products as InventoryProduct[],
            order,
            authCheck.user
          )
          break
        case "REQUEST_RETURN":
          outcome = requestBankTransferReturn(
            order as BankTransferReturnOrder
          )
          break
        case "RECEIVE_RETURN":
          outcome = receiveBankTransferReturn(
            order as BankTransferReturnOrder
          )
          break
        case "CONFIRM_RETURN_REFUND":
          outcome = confirmBankTransferReturnRefund(
            db.products as InventoryProduct[],
            order as BankTransferReturnOrder,
            authCheck.user
          )
          break
      }

      return { order, outcome }
    })

    return NextResponse.json({
      success: true,
      outcome: result.outcome,
      order: result.order,
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""

    if (code === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }

    const conflicts: Record<string, string> = {
      BANK_TRANSFER_REQUIRED:
        "To zamówienie nie korzysta z przelewu bankowego.",
      BANK_TRANSFER_ALREADY_REFUNDED:
        "Zwrot dla tego przelewu został już potwierdzony.",
      BANK_TRANSFER_ORDER_TERMINAL:
        "Stan zamówienia nie pozwala na tę operację płatniczą.",
      BANK_TRANSFER_INVALID_PAYMENT_STATE:
        "Stan płatności przelewu nie pozwala na potwierdzenie wpływu.",
      BANK_TRANSFER_REFUND_REQUIRES_PAID:
        "Ręczny zwrot można potwierdzić dopiero po wcześniejszym zaksięgowaniu płatności.",
      BANK_TRANSFER_RMA_REQUIRED:
        "Wysłane zamówienie wymaga procesu RMA przed potwierdzeniem ręcznego zwrotu środków.",
      BANK_TRANSFER_RETURN_INVALID_ORDER_STATUS:
        "RMA przelewu można prowadzić tylko dla wysłanego zamówienia.",
      BANK_TRANSFER_RETURN_PAYMENT_REQUIRED:
        "RMA przelewu wymaga wcześniej zaksięgowanej płatności.",
      BANK_TRANSFER_RETURN_INVALID_STATE:
        "Stan RMA przelewu nie pozwala na tę operację.",
      BANK_TRANSFER_RETURN_NOT_REQUESTED:
        "Najpierw otwórz RMA, zanim potwierdzisz odbiór towaru.",
      BANK_TRANSFER_RETURN_NOT_RECEIVED:
        "Najpierw potwierdź fizyczny odbiór zwracanego towaru.",
      BANK_TRANSFER_RETURN_STOCK_ALREADY_RESTOCKED:
        "Towar z tego RMA został już zwrócony na magazyn.",
      BANK_TRANSFER_RETURN_INVENTORY_NOT_FINALIZED:
        "Stan magazynowy zamówienia nie pozwala bezpiecznie zakończyć RMA.",
      INVENTORY_RESERVATION_INVALID_STATE:
        "Stan rezerwacji magazynowej nie pozwala bezpiecznie anulować zamówienia.",
      INVENTORY_RESERVATION_MISSING_ITEMS:
        "Brak pozycji potrzebnych do rozliczenia rezerwacji magazynowej.",
      PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED:
        "Ten operator płatności nie obsługuje wymaganej operacji.",
    }

    if (code in conflicts) {
      return NextResponse.json(
        { error: conflicts[code] },
        { status: 409 }
      )
    }

    console.error("Bank transfer settlement error:", error)
    return NextResponse.json(
      { error: "Nie udało się bezpiecznie rozliczyć przelewu bankowego." },
      { status: 500 }
    )
  }
}
