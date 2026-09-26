import { describe, expect, it } from "vitest"
import {
  PAYMENT_PROVIDER_CAPABILITIES,
  PAYMENT_PROVIDER_IDS,
  assertPaymentProviderCapability,
  describeOrderPaymentLifecycle,
  getPaymentProviderDefinition,
  listPaymentProviderDefinitions,
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
} from "@/lib/paymentProviders"
import { listPaymentCheckoutAdapterIds } from "@/lib/paymentProviderCheckout"

describe("payment provider registry", () => {
  it("keeps provider metadata and checkout adapters in lockstep", () => {
    expect(listPaymentProviderDefinitions().map((provider) => provider.id)).toEqual(
      PAYMENT_PROVIDER_IDS
    )
    expect(listPaymentCheckoutAdapterIds().sort()).toEqual(
      [...PAYMENT_PROVIDER_IDS].sort()
    )
  })

  it("describes provider-specific behavior without exposing runtime secrets", () => {
    expect(getPaymentProviderDefinition("STRIPE")).toMatchObject({
      id: "STRIPE",
      kind: "REDIRECT",
      disabledMessage:
        "Płatność Stripe została wyłączona przez administratora.",
    })
    expect(getPaymentProviderDefinition("BANK_TRANSFER")).toMatchObject({
      id: "BANK_TRANSFER",
      kind: "MANUAL",
      disabledMessage: "Przelew bankowy jest obecnie niedostępny.",
    })
  })

  it("declares a complete lifecycle capability contract for every provider", () => {
    for (const provider of listPaymentProviderDefinitions()) {
      expect(Object.keys(provider.capabilities).sort()).toEqual(
        [...PAYMENT_PROVIDER_CAPABILITIES].sort()
      )
    }

    expect(getPaymentProviderDefinition("STRIPE").capabilities).toEqual({
      checkout: true,
      webhook: true,
      cancel: true,
      refund: true,
      reconcile: true,
      rma: true,
      manualSettlement: false,
    })

    expect(getPaymentProviderDefinition("BANK_TRANSFER").capabilities).toEqual({
      checkout: true,
      webhook: false,
      cancel: true,
      refund: true,
      reconcile: false,
      rma: true,
      manualSettlement: true,
    })
  })

  it("fails closed when a provider does not support a lifecycle capability", () => {
    expect(supportsPaymentProviderCapability("STRIPE", "webhook")).toBe(true)
    expect(supportsPaymentProviderCapability("BANK_TRANSFER", "webhook")).toBe(false)
    expect(supportsPaymentProviderCapability("BANK_TRANSFER", "reconcile")).toBe(
      false
    )

    expect(() =>
      assertPaymentProviderCapability("BANK_TRANSFER", "webhook")
    ).toThrow("PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED")
  })

  it("resolves provider identity for current and legacy orders", () => {
    expect(
      resolveOrderPaymentProvider({ paymentProvider: "BANK_TRANSFER" })
    ).toBe("BANK_TRANSFER")

    expect(
      resolveOrderPaymentProvider({
        stripeCheckoutSessionId: "cs_legacy_123",
      })
    ).toBe("STRIPE")

    expect(
      resolveOrderPaymentProvider({
        bankTransferReference: "ORD-legacy",
      })
    ).toBe("BANK_TRANSFER")

    expect(
      resolveOrderPaymentProvider({ paymentProvider: "UNKNOWN" })
    ).toBeNull()

    expect(
      resolveOrderPaymentProvider({
        paymentProvider: "UNKNOWN",
        stripeCheckoutSessionId: "cs_should_not_override_explicit_provider",
      })
    ).toBeNull()
  })

  it("describes safe order lifecycle metadata for current and legacy records", () => {
    expect(
      describeOrderPaymentLifecycle({
        paymentProvider: "BANK_TRANSFER",
        bankTransferReference: "ORD-1",
      })
    ).toEqual({
      provider: "BANK_TRANSFER",
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
      inferredFromLegacyFields: false,
    })

    expect(
      describeOrderPaymentLifecycle({
        stripeCheckoutSessionId: "cs_legacy",
      })
    ).toMatchObject({
      provider: "STRIPE",
      kind: "REDIRECT",
      inferredFromLegacyFields: true,
    })

    expect(
      describeOrderPaymentLifecycle({ paymentProvider: "UNKNOWN" })
    ).toBeNull()
  })

  it("routes operational readiness through provider definitions", () => {
    expect(
      getPaymentProviderDefinition("STRIPE").operationalStatus({
        nodeEnv: "development",
        stripeSecretKey: "sk_test_123",
        stripeWebhookSecret: "",
      })
    ).toEqual({
      configured: true,
      webhookConfigured: false,
      configurationIssues: [],
    })

    expect(
      getPaymentProviderDefinition("BANK_TRANSFER").operationalStatus({
        bankTransferRecipient: "ONICS Sp. z o.o.",
        bankTransferAccountNumber: "PL12 3456 7890 1234 5678 9012 3456",
      })
    ).toEqual({
      configured: true,
      webhookConfigured: false,
      configurationIssues: [],
    })
  })
  it("returns safe configuration issue codes instead of secret values", () => {
    const stripe = getPaymentProviderDefinition("STRIPE").operationalStatus({
      nodeEnv: "production",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      appUrl: "http://shop.example.com",
    })
    expect(stripe).toEqual({
      configured: false,
      webhookConfigured: false,
      configurationIssues: [
        "CREDENTIALS_MISSING",
        "WEBHOOK_SECRET_MISSING",
        "PUBLIC_APP_URL_INVALID",
      ],
    })

    const bankTransfer = getPaymentProviderDefinition(
      "BANK_TRANSFER"
    ).operationalStatus({
      bankTransferRecipient: "",
      bankTransferAccountNumber: "123",
    })
    expect(bankTransfer).toEqual({
      configured: false,
      webhookConfigured: false,
      configurationIssues: ["RECIPIENT_MISSING", "ACCOUNT_NUMBER_INVALID"],
    })

    expect(JSON.stringify({ stripe, bankTransfer })).not.toContain(
      "http://shop.example.com"
    )
  })

})
