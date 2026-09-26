import { describe, expect, it } from "vitest"
import {
  moneyToMinorUnits,
  nextPaymentStatus,
  resolveStripeCheckoutConfig,
  validateOptionalStripeReadiness,
  verifyCheckoutPayment,
  verifyStripeRefund,
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

  it("never downgrades an already paid or refunded order", () => {
    expect(nextPaymentStatus("REFUNDED", "PAID")).toBe("REFUNDED")
    expect(nextPaymentStatus("REFUNDED", "FAILED")).toBe("REFUNDED")
    expect(nextPaymentStatus("PAID", "FAILED")).toBe("PAID")
    expect(nextPaymentStatus("PAID", "EXPIRED")).toBe("PAID")
    expect(nextPaymentStatus("PENDING", "PAID")).toBe("PAID")
  })
  it("verifies a full PLN refund against the original order", () => {
    expect(
      verifyStripeRefund(
        {
          ...order,
          stripePaymentIntentId: "pi_123",
        },
        {
          orderId: "ORD-123",
          refundId: "re_123",
          paymentIntentId: "pi_123",
          amount: 12345,
          currency: "pln",
          status: "succeeded",
        }
      )
    ).toEqual({ ok: true })

    expect(
      verifyStripeRefund(
        {
          ...order,
          stripePaymentIntentId: "pi_123",
        },
        {
          orderId: "ORD-123",
          refundId: "re_partial",
          paymentIntentId: "pi_123",
          amount: 100,
          currency: "pln",
          status: "succeeded",
        }
      ).ok
    ).toBe(false)
  })

}

describe("Stripe runtime configuration", () => {
  it("requires webhook verification and an explicit HTTPS origin in production", () => {
    expect(() =>
      resolveStripeCheckoutConfig({
        nodeEnv: "production",
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "",
        appUrl: "https://shop.example.com",
      })
    ).toThrow(/STRIPE_WEBHOOK_SECRET/)

    expect(() =>
      resolveStripeCheckoutConfig({
        nodeEnv: "production",
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "whsec_test",
        appUrl: "",
        requestUrl: "https://attacker.example/api/checkout",
      })
    ).toThrow(/NEXT_PUBLIC_APP_URL/)

    expect(() =>
      resolveStripeCheckoutConfig({
        nodeEnv: "production",
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "whsec_test",
        appUrl: "http://shop.example.com",
      })
    ).toThrow(/HTTPS/)
  })

  it("returns a normalized configured production origin", () => {
    expect(
      resolveStripeCheckoutConfig({
        nodeEnv: "production",
        stripeSecretKey: " sk_test ",
        stripeWebhookSecret: " whsec_test ",
        appUrl: "https://shop.example.com",
      })
    ).toEqual({
      stripeSecretKey: "sk_test",
      appUrl: "https://shop.example.com",
    })
  })

  it("allows request-origin fallback only outside production", () => {
    expect(
      resolveStripeCheckoutConfig({
        nodeEnv: "development",
        stripeSecretKey: "sk_test",
        requestUrl: "http://localhost:3001/api/checkout",
      })
    ).toMatchObject({
      appUrl: "http://localhost:3001",
    })
  })

  it("treats Stripe as optional only when both server secrets are absent", () => {
    expect(() =>
      validateOptionalStripeReadiness({
        nodeEnv: "production",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
        appUrl: "",
      })
    ).not.toThrow()

    expect(() =>
      validateOptionalStripeReadiness({
        nodeEnv: "production",
        stripeSecretKey: "sk_test",
        stripeWebhookSecret: "",
        appUrl: "https://shop.example.com",
      })
    ).toThrow(/STRIPE_WEBHOOK_SECRET/)
  })
})
