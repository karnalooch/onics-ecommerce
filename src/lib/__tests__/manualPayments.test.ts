import { describe, expect, it } from "vitest"
import {
  confirmBankTransferPayment,
  confirmBankTransferRefund,
  type BankTransferOrder,
} from "@/lib/manualPayments"
import type { InventoryProduct } from "@/lib/inventoryReservations"

function order(
  overrides: Partial<BankTransferOrder> = {}
): BankTransferOrder {
  return {
    id: "ORD-1",
    status: "PENDING_VERIFICATION",
    paymentProvider: "BANK_TRANSFER",
    paymentStatus: "PENDING",
    inventoryReservationSource: "ORDER",
    inventoryReservationStatus: "RESERVED",
    items: [{ id: "p1", quantity: 2 }],
    ...overrides,
  }
}

describe("bank transfer payment lifecycle", () => {
  it("confirms a pending transfer idempotently and records the operator", () => {
    const current = order()

    expect(
      confirmBankTransferPayment(
        current,
        { id: "admin-1", email: "admin@example.com" },
        "2026-09-26T10:00:00.000Z"
      )
    ).toBe("confirmed")

    expect(current).toMatchObject({
      paymentStatus: "PAID",
      paidAt: "2026-09-26T10:00:00.000Z",
      paymentConfirmedAt: "2026-09-26T10:00:00.000Z",
      paymentConfirmedBy: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })

    expect(
      confirmBankTransferPayment(
        current,
        { id: "other-admin" },
        "2026-09-26T11:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(current.paymentConfirmedBy?.id).toBe("admin-1")
  })

  it("does not confirm terminal or non-bank orders", () => {
    expect(() =>
      confirmBankTransferPayment(order({ paymentProvider: "STRIPE" }), {})
    ).toThrow("BANK_TRANSFER_REQUIRED")
    expect(() =>
      confirmBankTransferPayment(order({ status: "CANCELLED" }), {})
    ).toThrow("BANK_TRANSFER_ORDER_TERMINAL")
  })

  it("confirms an external refund and releases reserved inventory", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const current = order({
      paymentStatus: "PAID",
      paidAt: "2026-09-26T09:00:00.000Z",
    })

    expect(
      confirmBankTransferRefund(
        products,
        current,
        { id: "admin-1", name: "Admin" },
        "2026-09-26T12:00:00.000Z"
      )
    ).toBe("refunded")

    expect(products[0].stock).toBe(10)
    expect(current).toMatchObject({
      paymentStatus: "REFUNDED",
      status: "CANCELLED",
      inventoryReservationStatus: "RELEASED",
      refundedAt: "2026-09-26T12:00:00.000Z",
      manualRefundConfirmedAt: "2026-09-26T12:00:00.000Z",
      manualRefundConfirmedBy: {
        id: "admin-1",
        name: "Admin",
      },
    })
  })

  it("requires RMA instead of pretending a shipped transfer refund is complete", () => {
    expect(() =>
      confirmBankTransferRefund(
        [{ id: "p1", stock: 8 }],
        order({
          status: "SHIPPED",
          paymentStatus: "PAID",
          inventoryReservationStatus: "FINALIZED",
        }),
        {}
      )
    ).toThrow("BANK_TRANSFER_RMA_REQUIRED")
  })
})
