import { describe, expect, it } from "vitest"
import {
  listAvailablePaymentAdminActions,
  type PaymentAdminActionOrder,
} from "@/lib/paymentAdminActions"
import {
  assertPaymentCheckoutResultContract,
  listPaymentCheckoutAdapterIds,
  type PaymentCheckoutResult,
} from "@/lib/paymentProviderCheckout"
import {
  PAYMENT_PROVIDER_CAPABILITIES,
  assertPaymentProviderCapability,
  getPaymentProviderDefinition,
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
  type PaymentProviderId,
  type PaymentProviderOrderIdentity,
  type PaymentRuntimeOptions,
} from "@/lib/paymentProviders"
import { normalizePaymentMethods } from "@/store/serverStore"

export type PaymentProviderContractHarness = {
  id: PaymentProviderId
  validRuntimeOptions: PaymentRuntimeOptions
  invalidRuntimeOptions: PaymentRuntimeOptions
  sensitiveRuntimeValues?: string[]
  legacyOrder?: PaymentProviderOrderIdentity
  checkoutResult: PaymentCheckoutResult
  assertIdempotency?: () => void
}

function orderFor(
  provider: PaymentProviderId,
  overrides: Partial<PaymentAdminActionOrder> = {}
): PaymentAdminActionOrder {
  return {
    paymentProvider: provider,
    status: "PENDING_VERIFICATION",
    paymentStatus: "PENDING",
    ...overrides,
  }
}

export function definePaymentProviderContract(
  harness: PaymentProviderContractHarness
) {
  describe(`${harness.id} provider contract`, () => {
    it("has a checkout adapter and a complete capability contract", () => {
      const provider = getPaymentProviderDefinition(harness.id)

      expect(listPaymentCheckoutAdapterIds()).toContain(harness.id)
      expect(provider.capabilities.checkout).toBe(true)
      expect(
        assertPaymentCheckoutResultContract(
          harness.id,
          harness.checkoutResult
        )
      ).toBe(harness.checkoutResult)
      const invalidCheckoutResult: PaymentCheckoutResult =
        provider.kind === "REDIRECT"
          ? {
              orderId: "ORD-CONTRACT-INVALID",
              paymentMethod: harness.id,
              nextAction: {
                type: "MANUAL",
                title: "Invalid",
                fields: [{ label: "Invalid", value: "Invalid" }],
              },
            }
          : {
              orderId: "ORD-CONTRACT-INVALID",
              paymentMethod: harness.id,
              nextAction: {
                type: "REDIRECT",
                url: "https://invalid.example",
              },
            }

      expect(() =>
        assertPaymentCheckoutResultContract(
          harness.id,
          invalidCheckoutResult
        )
      ).toThrow("PAYMENT_PROVIDER_CHECKOUT_CONTRACT_INVALID")

      expect(Object.keys(provider.capabilities).sort()).toEqual(
        [...PAYMENT_PROVIDER_CAPABILITIES].sort()
      )

      for (const capability of PAYMENT_PROVIDER_CAPABILITIES) {
        expect(
          supportsPaymentProviderCapability(harness.id, capability)
        ).toBe(provider.capabilities[capability])

        if (provider.capabilities[capability]) {
          expect(() =>
            assertPaymentProviderCapability(harness.id, capability)
          ).not.toThrow()
        } else {
          expect(() =>
            assertPaymentProviderCapability(harness.id, capability)
          ).toThrow("PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED")
        }
      }
    })

    it("fails closed when runtime configuration is incomplete", () => {
      const provider = getPaymentProviderDefinition(harness.id)
      const valid = provider.operationalStatus(harness.validRuntimeOptions)
      const invalid = provider.operationalStatus(harness.invalidRuntimeOptions)

      expect(valid.configured).toBe(true)
      expect(valid.configurationIssues).toEqual([])
      expect(invalid.configured).toBe(false)
      expect(invalid.configurationIssues.length).toBeGreaterThan(0)

      const serialized = JSON.stringify({ valid, invalid })
      for (const value of harness.sensitiveRuntimeValues ?? []) {
        expect(serialized).not.toContain(value)
      }
    })

    it("persists provider settings without provider-specific store branches", () => {
      const provider = getPaymentProviderDefinition(harness.id)
      const defaults = normalizePaymentMethods({})

      expect(defaults[harness.id]).toMatchObject(provider.settingsDefaults)

      const updatedAt = "2026-09-26T12:00:00.000Z"
      const persisted = normalizePaymentMethods({
        [harness.id]: {
          enabled: !provider.settingsDefaults.enabled,
          displayName: `Contract ${harness.id}`,
          displayOrder: 321,
          maintenanceMessage: "Contract maintenance",
          updatedAt,
        },
      })

      expect(persisted[harness.id]).toEqual({
        enabled: !provider.settingsDefaults.enabled,
        displayName: `Contract ${harness.id}`,
        displayOrder: 321,
        maintenanceMessage: "Contract maintenance",
        updatedAt,
      })
    })

    it("resolves explicit identity and legacy identity when defined", () => {
      expect(
        resolveOrderPaymentProvider({ paymentProvider: harness.id })
      ).toBe(harness.id)

      if (harness.legacyOrder) {
        expect(resolveOrderPaymentProvider(harness.legacyOrder)).toBe(
          harness.id
        )
        expect(
          resolveOrderPaymentProvider({
            ...harness.legacyOrder,
            paymentProvider: "UNKNOWN",
          })
        ).toBeNull()
      }
    })

    it("keeps admin lifecycle actions aligned with provider capabilities", () => {
      const provider = getPaymentProviderDefinition(harness.id)
      const pendingActions = listAvailablePaymentAdminActions(
        orderFor(harness.id)
      )

      expect(pendingActions.includes("CANCEL")).toBe(
        provider.capabilities.cancel
      )

      if (provider.kind === "MANUAL") {
        expect(pendingActions.includes("CONFIRM_PAYMENT")).toBe(
          provider.capabilities.manualSettlement
        )

        const paidActions = listAvailablePaymentAdminActions(
          orderFor(harness.id, { paymentStatus: "PAID" })
        )
        expect(paidActions.includes("CONFIRM_REFUND")).toBe(
          provider.capabilities.cancel &&
            provider.capabilities.refund &&
            provider.capabilities.manualSettlement
        )
      }

      const shippedActions = listAvailablePaymentAdminActions(
        orderFor(harness.id, {
          status: "SHIPPED",
          paymentStatus: "PAID",
        })
      )
      expect(shippedActions.includes("REQUEST_RETURN")).toBe(
        provider.capabilities.rma
      )

      const requestedActions = listAvailablePaymentAdminActions(
        orderFor(harness.id, {
          status: "SHIPPED",
          paymentStatus: "PAID",
          returnStatus: "REQUESTED",
        })
      )
      expect(requestedActions.includes("RECEIVE_RETURN")).toBe(
        provider.capabilities.rma
      )
    })

    it("keeps supported lifecycle mutations idempotent", () => {
      const provider = getPaymentProviderDefinition(harness.id)
      const hasLifecycleMutation =
        provider.capabilities.cancel ||
        provider.capabilities.refund ||
        provider.capabilities.rma ||
        provider.capabilities.manualSettlement

      if (!hasLifecycleMutation) {
        expect(harness.assertIdempotency).toBeUndefined()
        return
      }

      expect(harness.assertIdempotency).toBeTypeOf("function")
      harness.assertIdempotency?.()
    })
  })
}
