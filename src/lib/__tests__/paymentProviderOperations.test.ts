import { describe, expect, it } from "vitest"
import { describePaymentProviderOperations } from "@/lib/paymentProviderOperations"

describe("payment provider operations summary", () => {
  it("derives provider queues from lifecycle policy without provider-specific UI rules", () => {
    const operations = describePaymentProviderOperations([
      {
        id: "stripe-pending",
        paymentProvider: "STRIPE",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
        paymentReconciledAt: "2026-09-26T08:00:00.000Z",
      },
      {
        id: "stripe-failed-refund",
        paymentProvider: "STRIPE",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        refundStatus: "failed",
        refundUpdatedAt: "2026-09-26T09:30:00.000Z",
        paymentReconciledAt: "2026-09-26T09:00:00.000Z",
      },
      {
        id: "stripe-refund-pending",
        paymentProvider: "STRIPE",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        refundStatus: "pending",
      },
      {
        id: "bank-pending",
        paymentProvider: "BANK_TRANSFER",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
      },
      {
        id: "bank-return",
        paymentProvider: "BANK_TRANSFER",
        status: "SHIPPED",
        paymentStatus: "PAID",
        returnStatus: "REQUESTED",
      },
      {
        id: "unknown",
        paymentProvider: "UNKNOWN",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
      },
    ])

    expect(operations.STRIPE).toMatchObject({
      provider: "STRIPE",
      totalOrders: 3,
      ordersRequiringAttention: 1,
      pendingPayments: 1,
      pendingRefunds: 1,
      failedRefunds: 1,
      openReturns: 0,
      lastReconciledAt: "2026-09-26T09:00:00.000Z",
      lastErrorAt: "2026-09-26T09:30:00.000Z",
    })
    expect(operations.STRIPE.actionCounts.CANCEL).toBe(2)

    expect(operations.BANK_TRANSFER).toMatchObject({
      provider: "BANK_TRANSFER",
      totalOrders: 2,
      ordersRequiringAttention: 2,
      pendingPayments: 1,
      pendingRefunds: 0,
      failedRefunds: 0,
      openReturns: 1,
      lastReconciledAt: null,
      lastErrorAt: null,
    })
    expect(operations.BANK_TRANSFER.actionCounts.CANCEL).toBe(1)
    expect(operations.BANK_TRANSFER.actionCounts.CONFIRM_PAYMENT).toBe(1)
    expect(operations.BANK_TRANSFER.actionCounts.RECEIVE_RETURN).toBe(1)
  })

  it("ignores invalid timestamps and keeps empty summaries for providers with no orders", () => {
    const operations = describePaymentProviderOperations([
      {
        paymentProvider: "STRIPE",
        status: "CANCELLED",
        paymentStatus: "EXPIRED",
        paymentReconciledAt: "not-a-date",
        refundStatus: "failed",
        refundUpdatedAt: "also-not-a-date",
      },
    ])

    expect(operations.STRIPE.lastReconciledAt).toBeNull()
    expect(operations.STRIPE.lastErrorAt).toBeNull()
    expect(operations.BANK_TRANSFER).toMatchObject({
      totalOrders: 0,
      ordersRequiringAttention: 0,
      pendingPayments: 0,
      pendingRefunds: 0,
      failedRefunds: 0,
      openReturns: 0,
    })
  })
})
