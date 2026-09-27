import { describe, expect, it } from "vitest"
import { PAYMENT_PROVIDER_IDS } from "@/lib/paymentProviders"
import {
  CHECKOUT_PAYMENT_METHOD_IDS,
  validateCheckoutPaymentDiscovery,
} from "@/lib/checkoutPaymentDiscoveryContract"

const response = {
  control: {
    enabled: true,
    state: "ready",
    maintenanceMessage: null,
    updatedAt: null,
  },
  methods: [
    {
      id: "STRIPE",
      name: "Stripe",
      enabled: true,
      configured: true,
      available: true,
      kind: "REDIRECT",
      maintenanceMessage: null,
    },
    {
      id: "BANK_TRANSFER",
      name: "Przelew bankowy",
      enabled: false,
      configured: true,
      available: false,
      kind: "MANUAL",
      maintenanceMessage: "Przelewy chwilowo wyłączone",
    },
    {
      id: "PRZELEWY24",
      name: "Przelewy24",
      enabled: true,
      configured: false,
      available: false,
      kind: "REDIRECT",
      maintenanceMessage: null,
    },
  ],
}

describe("checkout payment discovery response contract", () => {
  it("stays aligned with the registered provider ids", () => {
    expect(CHECKOUT_PAYMENT_METHOD_IDS).toEqual(PAYMENT_PROVIDER_IDS)
  })

  it("accepts a complete internally consistent discovery response", () => {
    expect(validateCheckoutPaymentDiscovery(response)).toEqual({
      control: {
        enabled: true,
        maintenanceMessage: null,
      },
      methods: response.methods,
    })
  })

  it("rejects missing, unexpected and duplicate methods", () => {
    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: response.methods.slice(0, 2),
      })
    ).toThrow(/niepełny zestaw/)

    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: [
          response.methods[0],
          response.methods[1],
          { ...response.methods[2], id: "UNKNOWN" },
        ],
      })
    ).toThrow(/nieznaną metodę/)

    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: [
          response.methods[0],
          response.methods[1],
          { ...response.methods[2], id: "STRIPE" },
        ],
      })
    ).toThrow(/zduplikowaną metodę/)
  })

  it("rejects malformed control and method fields", () => {
    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        control: { ...response.control, enabled: "yes" },
      })
    ).toThrow(/global enabled/)

    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: [
          { ...response.methods[0], name: "" },
          ...response.methods.slice(1),
        ],
      })
    ).toThrow(/nazwy/)
  })

  it("rejects provider-kind and availability contradictions", () => {
    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: [
          { ...response.methods[0], kind: "MANUAL" },
          ...response.methods.slice(1),
        ],
      })
    ).toThrow(/niespójny typ/)

    expect(() =>
      validateCheckoutPaymentDiscovery({
        ...response,
        methods: [
          { ...response.methods[0], available: false },
          ...response.methods.slice(1),
        ],
      })
    ).toThrow(/niespójną dostępność/)
  })
})
