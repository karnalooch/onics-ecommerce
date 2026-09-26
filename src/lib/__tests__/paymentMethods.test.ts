import { describe, expect, it } from "vitest"
import {
  bankTransferOperationalStatus,
  describePaymentControl,
  describePaymentMethods,
  isPaymentControlEnabled,
  isPaymentMethodEnabled,
  resolvePaymentAvailability,
  przelewy24OperationalStatus,
  stripeOperationalStatus,
} from "@/lib/paymentMethods"
import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"

function settings(
  stripeEnabled: boolean,
  bankEnabled = false
): PaymentMethodSettings {
  return {
    STRIPE: {
      enabled: stripeEnabled,
      displayName: "Stripe",
      displayOrder: 20,
      maintenanceMessage: null,
      updatedAt: null,
    },
    BANK_TRANSFER: {
      enabled: bankEnabled,
      displayName: "Przelew tradycyjny",
      displayOrder: 10,
      maintenanceMessage: "Przelewy chwilowo wyłączone",
      updatedAt: null,
    },
    PRZELEWY24: {
      enabled: false,
      displayName: "Przelewy24",
      displayOrder: 30,
      maintenanceMessage: null,
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
  it("uses persisted provider switches as checkout gates", () => {
    expect(isPaymentMethodEnabled(settings(true), "STRIPE")).toBe(true)
    expect(isPaymentMethodEnabled(settings(false), "STRIPE")).toBe(false)
    expect(isPaymentMethodEnabled(settings(true, true), "BANK_TRANSFER")).toBe(
      true
    )
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
      state: "maintenance",
      maintenanceMessage: "Przerwa techniczna",
      updatedAt: null,
    })
  })


  it("derives ready, misconfigured, disabled and maintenance states without exposing secrets", () => {
    const providerStates = describePaymentMethods(settings(true, false), {
      nodeEnv: "production",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      appUrl: "http://shop.example.com",
      bankTransferRecipient: "ONICS Sp. z o.o.",
      bankTransferAccountNumber: "12345678901234567890123456",
    })

    expect(providerStates.find((method) => method.id === "STRIPE")).toMatchObject({
      state: "misconfigured",
      available: false,
      configurationIssues: [
        "CREDENTIALS_MISSING",
        "WEBHOOK_SECRET_MISSING",
        "PUBLIC_APP_URL_INVALID",
      ],
    })
    expect(
      providerStates.find((method) => method.id === "BANK_TRANSFER")
    ).toMatchObject({
      state: "maintenance",
      available: false,
      configurationIssues: [],
    })

    expect(JSON.stringify(providerStates)).not.toContain("http://shop.example.com")
    expect(JSON.stringify(providerStates)).not.toContain(
      "12345678901234567890123456"
    )
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
      configurationIssues: ["CREDENTIALS_MISSING"],
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
      configurationIssues: [],
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

  it("keeps Przelewy24 sandbox-only until its full lifecycle is implemented", () => {
    expect(
      przelewy24OperationalStatus({
        nodeEnv: "test",
        p24MerchantId: "123456",
        p24PosId: "123456",
        p24ApiKey: "api-key",
        p24Crc: "crc",
      })
    ).toEqual({
      configured: true,
      webhookConfigured: false,
      configurationIssues: [],
    })

    expect(
      przelewy24OperationalStatus({
        nodeEnv: "production",
        p24MerchantId: "123456",
        p24PosId: "123456",
        p24ApiKey: "api-key",
        p24Crc: "crc",
      })
    ).toEqual({
      configured: false,
      webhookConfigured: false,
      configurationIssues: ["PROVIDER_NOT_PRODUCTION_READY"],
    })
  })

  it("requires recipient and a valid Polish account number for bank transfer", () => {
    expect(
      bankTransferOperationalStatus({
        bankTransferRecipient: "ONICS Sp. z o.o.",
        bankTransferAccountNumber: "12 3456 7890 1234 5678 9012 3456",
      }).configured
    ).toBe(true)

    expect(
      bankTransferOperationalStatus({
        bankTransferRecipient: "ONICS Sp. z o.o.",
        bankTransferAccountNumber: "123",
      }).configured
    ).toBe(false)
  })

  it("sorts providers and exposes safe operational metadata only", () => {
    const methods = describePaymentMethods(settings(false, true), {
      nodeEnv: "production",
      stripeSecretKey: "sk_live_secret",
      stripeWebhookSecret: "whsec_secret",
      appUrl: "https://shop.example.com",
      bankTransferRecipient: "ONICS Sp. z o.o.",
      bankTransferAccountNumber: "12345678901234567890123456",
    })

    expect(methods.map((method) => method.id)).toEqual([
      "BANK_TRANSFER",
      "STRIPE",
      "PRZELEWY24",
    ])
    expect(methods[0]).toMatchObject({
      id: "BANK_TRANSFER",
      name: "Przelew tradycyjny",
      enabled: true,
      configured: true,
      state: "ready",
      configurationIssues: [],
      displayOrder: 10,
      kind: "MANUAL",
      capabilities: {
        checkout: true,
        webhook: false,
        cancel: true,
        refund: true,
        reconcile: false,
        rma: true,
        manualSettlement: true,
      },
      available: true,
    })
    expect(methods[1]).toMatchObject({
      id: "STRIPE",
      name: "Stripe",
      enabled: false,
      configured: true,
      webhookConfigured: true,
      state: "disabled",
      configurationIssues: [],
      displayOrder: 20,
      kind: "REDIRECT",
      capabilities: {
        checkout: true,
        webhook: true,
        cancel: true,
        refund: true,
        reconcile: true,
        rma: true,
        manualSettlement: false,
      },
      available: false,
    })

    expect(JSON.stringify(methods)).not.toContain("sk_live_secret")
    expect(JSON.stringify(methods)).not.toContain("whsec_secret")
    expect(JSON.stringify(methods)).not.toContain(
      "12345678901234567890123456"
    )
  })
})
