import { describe, expect, it } from "vitest"
import {
  moneyToMinorUnits,
  nextPaymentStatus,
  verifyCheckoutPayment,
} from "@/lib/payments"

describe("Stripe payment verification", () => {
  const order = {
    id: "ORD-123",
    totalPriceFinal: 123.45,
    stripeCheckoutSessionId: "cs_test_123",
    paymentStatus: "PENDING",
  }

  it("converts money to minor units deterministically", () => {
    expect(moneyToMinorUnits(123.45)).toBe(12345)
  })

  it("accepts a matching paid checkout snapshot", () => {
    expect(
      verifyCheckoutPayment(order, {
        orderId: "ORD-123",
        sessionId: "cs_test_123",
        amountTotal: 12345,
        currency: "PLN",
        paymentStatus: "paid",
      })
    ).toEqual({ ok: true })
  })

  it("rejects mismatched amount and session", () => {
    expect(
      verifyCheckoutPayment(order, {
        orderId: "ORD-123",
        sessionId: "cs_other",
        amountTotal: 12345,
        currency: "pln",
        paymentStatus: "paid",
      }).ok
    ).toBe(false)

    expect(
      verifyCheckoutPayment(order, {
        orderId: "ORD-123",
        sessionId: "cs_test_123",
        amountTotal: 999,
        currency: "pln",
        paymentStatus: "paid",
      }).ok
    ).toBe(false)
  })

  it("never downgrades an already paid order", () => {
    expect(nextPaymentStatus("PAID", "FAILED")).toBe("PAID")
    expect(nextPaymentStatus("PAID", "EXPIRED")).toBe("PAID")
    expect(nextPaymentStatus("PENDING", "PAID")).toBe("PAID")
  })
})
