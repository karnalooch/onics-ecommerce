import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  confirmBankTransferPayment,
  confirmBankTransferRefund,
  type BankTransferOrder,
} from "@/lib/manualPayments"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import { mutateMockData } from "@/store/serverStore"

const BankTransferActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["CONFIRM_PAYMENT", "CONFIRM_REFUND"]),
})

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

      const outcome =
        parsed.data.action === "CONFIRM_PAYMENT"
          ? confirmBankTransferPayment(order, authCheck.user)
          : confirmBankTransferRefund(
              db.products as InventoryProduct[],
              order,
              authCheck.user
            )

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
      INVENTORY_RESERVATION_INVALID_STATE:
        "Stan rezerwacji magazynowej nie pozwala bezpiecznie anulować zamówienia.",
      INVENTORY_RESERVATION_MISSING_ITEMS:
        "Brak pozycji potrzebnych do rozliczenia rezerwacji magazynowej.",
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
