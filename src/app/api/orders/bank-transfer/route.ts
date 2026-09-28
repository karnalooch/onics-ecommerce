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
  describeOrderPaymentLifecycle,
  resolveOrderPaymentProvider,
  type PaymentProviderCapability,
} from "@/lib/paymentProviders"
import {
  classifyPaymentAdminActionPrecondition,
  listAvailablePaymentAdminActions,
} from "@/lib/paymentAdminActions"
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
  expectedStateToken: z.string().regex(/^[a-f0-9]{64}$/).optional(),
})

type BankTransferAction = z.infer<typeof BankTransferActionSchema>["action"]

type StoredActor = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

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

  let parsed: ReturnType<typeof BankTransferActionSchema.safeParse>
  try {
    parsed = BankTransferActionSchema.safeParse(await readCommerceJson(req))
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie operacji przelewu bankowego jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie operacji przelewu bankowego." },
        { status: 400 }
      )
    }
    throw error
  }
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowa operacja przelewu bankowego." },
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

  try {
    const result = await mutateMockData((db) => {
      const currentActor = findStoredUserBySession(
        db.users as StoredActor[],
        authCheck.user
      )
      if (
        !currentActor ||
        !hasAccountRoleAccess(currentActor, ["ADMIN"])
      ) {
        throw new Error("ADMIN_ACCESS_REVOKED")
      }

      const order = (db.orders as BankTransferOrder[]).find(
        (candidate) => candidate.id === parsed.data.id
      )
      if (!order) throw new Error("ORDER_NOT_FOUND")

      const precondition = classifyPaymentAdminActionPrecondition(
        order,
        parsed.data.action,
        expectedStateToken
      )
      if (precondition === "replay") {
        return { order, outcome: "unchanged" as const, replayed: true }
      }
      if (precondition === "conflict") {
        throw new Error("PAYMENT_ADMIN_STATE_CONFLICT")
      }

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
    const code = error instanceof Error ? error.message : ""

    if (code === "ADMIN_ACCESS_REVOKED") {
      return NextResponse.json(
        { error: "Uprawnienia administratora zmieniły się przed rozliczeniem przelewu." },
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
        "Stan zamówienia zmienił się od ostatniego odczytu. Odśwież dane i ponów operację płatniczą.",
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
