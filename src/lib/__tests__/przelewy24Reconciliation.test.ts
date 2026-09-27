import { describe, expect, it } from "vitest"
import {
  classifyPrzelewy24TransactionReconciliation,
  classifyPrzelewy24VerificationRecovery,
  shouldReconcilePrzelewy24Order,
} from "@/lib/przelewy24Reconciliation"
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

describe("Przelewy24 verification crash recovery", () => {
  const staged = {
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
  }

  const transaction = {
    orderId: 456,
    sessionId: "ORD-P24-RECONCILE",
    status: 1,
    amount: 10000,
    currency: "PLN",
  }

  it("uses authoritative paid status to finish locally without replaying verify", () => {
    expect(
      classifyPrzelewy24VerificationRecovery(
        { ...transaction, status: 2 },
        staged
      )
    ).toBe("provider-paid")
  })

  it("keeps unverified provider states on the verify-required path", () => {
    expect(
      classifyPrzelewy24VerificationRecovery(
        { ...transaction, status: 0 },
        staged
      )
    ).toBe("verify-required")
    expect(
      classifyPrzelewy24VerificationRecovery(transaction, staged)
    ).toBe("verify-required")
  })

  it("fails closed on returned, unknown, or mismatched provider state", () => {
    expect(
      classifyPrzelewy24VerificationRecovery(
        { ...transaction, status: 3 },
        staged
      )
    ).toBe("provider-returned")

    expect(() =>
      classifyPrzelewy24VerificationRecovery(
        { ...transaction, status: 99 },
        staged
      )
    ).toThrow("PRZELEWY24_TRANSACTION_STATUS_UNKNOWN")

    expect(() =>
      classifyPrzelewy24VerificationRecovery(
        { ...transaction, amount: 9999, status: 2 },
        staged
      )
    ).toThrow("PRZELEWY24_STAGED_TRANSACTION_MISMATCH")
  })
})

describe("Przelewy24 transaction reconciliation states", () => {
  const transaction = {
    orderId: 456,
    sessionId: "ORD-P24-RECONCILE",
    amount: 10000,
    currency: "PLN",
  }

  it("does not verify an unpaid transaction", () => {
    expect(
      classifyPrzelewy24TransactionReconciliation({
        ...transaction,
        status: 0,
      })
    ).toBe("unpaid")
  })

  it("verifies only an advance payment and accepts provider-paid truth", () => {
    expect(
      classifyPrzelewy24TransactionReconciliation({
        ...transaction,
        status: 1,
      })
    ).toBe("verify-required")
    expect(
      classifyPrzelewy24TransactionReconciliation({
        ...transaction,
        status: 2,
      })
    ).toBe("provider-paid")
  })

  it("routes returned transactions to manual review and rejects unknown states", () => {
    expect(
      classifyPrzelewy24TransactionReconciliation({
        ...transaction,
        status: 3,
      })
    ).toBe("provider-returned")
    expect(() =>
      classifyPrzelewy24TransactionReconciliation({
        ...transaction,
        status: 99,
      })
    ).toThrow("PRZELEWY24_TRANSACTION_STATUS_UNKNOWN")
  })
})

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
