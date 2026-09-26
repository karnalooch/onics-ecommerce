import { describe, expect, it } from "vitest"
import {
  PAYMENT_PROVIDER_IDS,
  getPaymentProviderDefinition,
  listPaymentProviderDefinitions,
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
    })

    expect(
      getPaymentProviderDefinition("BANK_TRANSFER").operationalStatus({
        bankTransferRecipient: "ONICS Sp. z o.o.",
        bankTransferAccountNumber: "PL12 3456 7890 1234 5678 9012 3456",
      })
    ).toEqual({
      configured: true,
      webhookConfigured: false,
    })
  })
})
