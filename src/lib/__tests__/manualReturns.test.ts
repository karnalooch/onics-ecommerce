import { describe, expect, it } from "vitest"
import {
  confirmBankTransferReturnRefund,
  receiveBankTransferReturn,
  requestBankTransferReturn,
  type BankTransferReturnOrder,
} from "@/lib/manualReturns"
import type { InventoryProduct } from "@/lib/inventoryReservations"

function order(
  overrides: Partial<BankTransferReturnOrder> = {}
): BankTransferReturnOrder {
  return {
    id: "ORD-1",
    status: "SHIPPED",
    paymentProvider: "BANK_TRANSFER",
    paymentStatus: "PAID",
    inventoryReservationSource: "ORDER",
    inventoryReservationStatus: "FINALIZED",
    items: [{ id: "p1", quantity: 2 }],
    ...overrides,
  }
}

describe("bank transfer RMA lifecycle", () => {
  it("opens and receives a shipped paid bank-transfer return idempotently", () => {
    const current = order()

    expect(
      requestBankTransferReturn(
        current,
        "2026-09-26T12:00:00.000Z"
      )
    ).toBe("requested")
    expect(current.returnStatus).toBe("REQUESTED")

    expect(
      requestBankTransferReturn(
        current,
        "2026-09-26T12:05:00.000Z"
      )
    ).toBe("requested")
    expect(current.returnRequestedAt).toBe(
      "2026-09-26T12:00:00.000Z"
    )

    expect(
      receiveBankTransferReturn(
        current,
        "2026-09-26T13:00:00.000Z"
      )
    ).toBe("received")
    expect(current.returnStatus).toBe("RECEIVED")
  })

  it("requires physical receipt before external refund confirmation", () => {
    expect(() =>
      confirmBankTransferReturnRefund(
        [{ id: "p1", stock: 8 }],
        order({ returnStatus: "REQUESTED" }),
        { id: "admin-1" }
      )
    ).toThrow("BANK_TRANSFER_RETURN_NOT_RECEIVED")
  })

  it("completes RMA only after refund confirmation and restocks once", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const current = order({
      returnStatus: "RECEIVED",
      returnRequestedAt: "2026-09-26T12:00:00.000Z",
      returnReceivedAt: "2026-09-26T13:00:00.000Z",
    })

    expect(
      confirmBankTransferReturnRefund(
        products,
        current,
        { id: "admin-1", email: "admin@example.com" },
        "2026-09-26T14:00:00.000Z"
      )
    ).toBe("completed")

    expect(products[0].stock).toBe(10)
    expect(current).toMatchObject({
      status: "RETURNED",
      returnStatus: "COMPLETED",
      paymentStatus: "REFUNDED",
      inventoryRefundRestockedAt: "2026-09-26T14:00:00.000Z",
      refundedAt: "2026-09-26T14:00:00.000Z",
      manualRefundConfirmedBy: {
        id: "admin-1",
        email: "admin@example.com",
      },
    })

    expect(
      confirmBankTransferReturnRefund(
        products,
        current,
        { id: "other-admin" },
        "2026-09-26T15:00:00.000Z"
      )
    ).toBe("completed")
    expect(products[0].stock).toBe(10)
  })

  it("rejects unpaid, non-shipped and non-bank RMA attempts", () => {
    expect(() =>
      requestBankTransferReturn(
        order({ paymentStatus: "PENDING" })
      )
    ).toThrow("BANK_TRANSFER_RETURN_PAYMENT_REQUIRED")

    expect(() =>
      requestBankTransferReturn(
        order({ status: "CONFIRMED" })
      )
    ).toThrow("BANK_TRANSFER_RETURN_INVALID_ORDER_STATUS")

    expect(() =>
      requestBankTransferReturn(
        order({ paymentProvider: "STRIPE" })
      )
    ).toThrow("BANK_TRANSFER_REQUIRED")
  })
})
