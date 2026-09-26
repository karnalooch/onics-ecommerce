import { describe, expect, it } from "vitest"
import {
  describePaymentMethods,
  isPaymentMethodEnabled,
  stripeOperationalStatus,
} from "@/lib/paymentMethods"
import type { PaymentMethodSettings } from "@/store/serverStore"

function settings(enabled: boolean): PaymentMethodSettings {
  return {
    STRIPE: {
      enabled,
      updatedAt: null,
    },
  }
}

describe("payment method management", () => {
  it("uses the persisted admin switch as the checkout gate", () => {
    expect(isPaymentMethodEnabled(settings(true), "STRIPE")).toBe(true)
    expect(isPaymentMethodEnabled(settings(false), "STRIPE")).toBe(false)
  })

  it("requires the Stripe secret for availability", () => {
    expect(
      stripeOperationalStatus({
        nodeEnv: "development",
        stripeSecretKey: "",
        stripeWebhookSecret: "",
      })
    ).toEqual({
      configured: false,
      webhookConfigured: false,
    })

    expect(
      stripeOperationalStatus({
        nodeEnv: "development",
        stripeSecretKey: "sk_test_123",
        stripeWebhookSecret: "",
      })
    ).toEqual({
      configured: true,
      webhookConfigured: false,
    })
  })

  it("requires webhook configuration in production before Stripe can be enabled", () => {
    expect(
      stripeOperationalStatus({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_123",
        stripeWebhookSecret: "",
      }).configured
    ).toBe(false)

    expect(
      stripeOperationalStatus({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_123",
        stripeWebhookSecret: "whsec_123",
      }).configured
    ).toBe(true)
  })

  it("exposes only operational flags and never Stripe secrets", () => {
    const methods = describePaymentMethods(settings(false), {
      nodeEnv: "production",
      stripeSecretKey: "sk_live_secret",
      stripeWebhookSecret: "whsec_secret",
    })

    expect(methods).toEqual([
      {
        id: "STRIPE",
        name: "Stripe",
        enabled: false,
        configured: true,
        webhookConfigured: true,
        updatedAt: null,
      },
    ])

    expect(JSON.stringify(methods)).not.toContain("sk_live_secret")
    expect(JSON.stringify(methods)).not.toContain("whsec_secret")
  })
})
