import { describe, expect, it } from "vitest"
import { shouldReconcilePrzelewy24Order } from "@/lib/przelewy24Reconciliation"
import type { Przelewy24StoredOrder } from "@/lib/przelewy24"

function order(
  overrides: Partial<Przelewy24StoredOrder> = {}
): Przelewy24StoredOrder {
  return {
    id: "ORD-P24-RECONCILE",
    status: "PENDING_VERIFICATION",
    paymentProvider: "PRZELEWY24",
    totalPriceFinal: 100,
    paymentStatus: "PENDING",
    p24SessionId: "ORD-P24-RECONCILE",
    inventoryReservationSource: "ORDER",
    inventoryReservationStatus: "RESERVED",
    items: [{ id: "p1", quantity: 1 }],
    ...overrides,
  }
}

describe("Przelewy24 reconciliation selection", () => {
  it("selects unresolved payments", () => {
    expect(shouldReconcilePrzelewy24Order(order())).toBe(true)
    expect(
      shouldReconcilePrzelewy24Order(
        order({ paymentStatus: "FAILED" })
      )
    ).toBe(true)
  })

  it("selects durable verification intents even after payment state changed", () => {
    expect(
      shouldReconcilePrzelewy24Order(
        order({
          paymentStatus: "PAID",
          p24VerificationPending: {
            merchantId: 123,
            posId: 123,
            sessionId: "ORD-P24-RECONCILE",
            amount: 10000,
            originAmount: 10000,
            currency: "PLN",
            orderId: 456,
            methodId: 25,
            statement: "ONICS",
            sign: "a".repeat(96),
          },
        })
      )
    ).toBe(true)
  })

  it("selects pending refunds after payment completion", () => {
    expect(
      shouldReconcilePrzelewy24Order(
        order({
          paymentStatus: "PAID",
          refundStatus: "pending",
          p24OrderId: 456,
        })
      )
    ).toBe(true)
  })

  it("skips locally terminal orders without unresolved provider work", () => {
    expect(
      shouldReconcilePrzelewy24Order(
        order({ paymentStatus: "PAID" })
      )
    ).toBe(false)
    expect(
      shouldReconcilePrzelewy24Order(
        order({ paymentStatus: "REFUNDED" })
      )
    ).toBe(false)
    expect(
      shouldReconcilePrzelewy24Order(
        order({ paymentStatus: "EXPIRED" })
      )
    ).toBe(false)
  })

  it("requires a P24 session identity", () => {
    expect(
      shouldReconcilePrzelewy24Order(
        order({ p24SessionId: null })
      )
    ).toBe(false)
  })
})
