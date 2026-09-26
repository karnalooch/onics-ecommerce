import { describe, expect, it } from "vitest"
import {
  describePaymentControl,
  describePaymentMethods,
  isPaymentControlEnabled,
  isPaymentMethodEnabled,
  resolvePaymentAvailability,
  stripeOperationalStatus,
} from "@/lib/paymentMethods"
import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"

function settings(enabled: boolean): PaymentMethodSettings {
  return {
    STRIPE: {
      enabled,
      updatedAt: null,
    },
  }
}

function control(enabled: boolean): PaymentControlSettings {
  return {
    enabled,
    maintenanceMessage: enabled ? null : "Przerwa techniczna",
    updatedAt: null,
  }
}

describe("payment method management", () => {
  it("uses the persisted provider switch as a checkout gate", () => {
    expect(isPaymentMethodEnabled(settings(true), "STRIPE")).toBe(true)
    expect(isPaymentMethodEnabled(settings(false), "STRIPE")).toBe(false)
  })

  it("requires both global and provider switches for payment availability", () => {
    expect(isPaymentControlEnabled(control(true))).toBe(true)
    expect(isPaymentControlEnabled(control(false))).toBe(false)

    expect(
      resolvePaymentAvailability(control(true), settings(true), "STRIPE")
    ).toBe(true)
    expect(
      resolvePaymentAvailability(control(false), settings(true), "STRIPE")
    ).toBe(false)
    expect(
      resolvePaymentAvailability(control(true), settings(false), "STRIPE")
    ).toBe(false)
  })

  it("exposes a safe global maintenance snapshot", () => {
    expect(describePaymentControl(control(false))).toEqual({
      enabled: false,
      maintenanceMessage: "Przerwa techniczna",
      updatedAt: null,
    })
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
        appUrl: "https://shop.example.com",
      }).configured
    ).toBe(false)

    expect(
      stripeOperationalStatus({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_123",
        stripeWebhookSecret: "whsec_123",
        appUrl: "http://shop.example.com",
      }).configured
    ).toBe(false)

    expect(
      stripeOperationalStatus({
        nodeEnv: "production",
        stripeSecretKey: "sk_live_123",
        stripeWebhookSecret: "whsec_123",
        appUrl: "https://shop.example.com",
      }).configured
    ).toBe(true)
  })

  it("exposes only operational flags and never Stripe secrets", () => {
    const methods = describePaymentMethods(settings(false), {
      nodeEnv: "production",
      stripeSecretKey: "sk_live_secret",
      stripeWebhookSecret: "whsec_secret",
      appUrl: "https://shop.example.com",
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
