import { describe, expect, it } from "vitest"
import {
  canReplaceOrderItems,
  resolveEstimatedDeliveryDays,
  validateStripeOrderStatusTransition,
} from "@/lib/orders"

describe("order delivery estimate updates", () => {
  it("preserves the existing estimate when the field is omitted", () => {
    expect(resolveEstimatedDeliveryDays(undefined, 14)).toBe(14)
    expect(resolveEstimatedDeliveryDays(undefined, null)).toBeNull()
  })

  it("clears the existing estimate when null is sent explicitly", () => {
    expect(resolveEstimatedDeliveryDays(null, 14)).toBeNull()
  })

  it("replaces the estimate when a number is provided", () => {
    expect(resolveEstimatedDeliveryDays(7, 14)).toBe(7)
  })
})

describe("Stripe-linked order item updates", () => {
  const currentItems = [
    {
      id: "p1",
      sku: "SKU-1",
      name: "Produkt",
      quantity: 2,
      price: 99.5,
    },
  ]

  it("allows item edits before a Stripe checkout session is linked", () => {
    expect(
      canReplaceOrderItems(
        null,
        [{ ...currentItems[0], price: 89.5 }],
        currentItems
      )
    ).toBe(true)
  })

  it("allows status-only updates after Stripe checkout is linked", () => {
    expect(canReplaceOrderItems("cs_test_123", undefined, currentItems)).toBe(true)
  })

  it("allows an unchanged item snapshot after Stripe checkout is linked", () => {
    expect(
      canReplaceOrderItems(
        "cs_test_123",
        currentItems.map((item) => ({ ...item })),
        currentItems
      )
    ).toBe(true)
  })

  it("rejects monetary or quantity changes after Stripe checkout is linked", () => {
    expect(
      canReplaceOrderItems(
        "cs_test_123",
        [{ ...currentItems[0], price: 89.5 }],
        currentItems
      )
    ).toBe(false)

    expect(
      canReplaceOrderItems(
        "cs_test_123",
        [{ ...currentItems[0], quantity: 3 }],
        currentItems
      )
    ).toBe(false)
  })
})


describe("Stripe-linked order status transitions", () => {
  it("requires payment before fulfillment states", () => {
    expect(
      validateStripeOrderStatusTransition("cs_test", "PENDING", "CONFIRMED")
    ).toBe("payment-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "FAILED", "SHIPPED")
    ).toBe("payment-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "CONFIRMED")
    ).toBe("ok")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "SHIPPED")
    ).toBe("ok")
  })

  it("does not fake Stripe cancellation through a local status change", () => {
    expect(
      validateStripeOrderStatusTransition("cs_test", "PENDING", "CANCELLED")
    ).toBe("stripe-cancel-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "CANCELLED")
    ).toBe("stripe-cancel-required")
  })

  it("does not downgrade Stripe orders into inquiry status", () => {
    expect(
      validateStripeOrderStatusTransition("cs_test", "PENDING", "INQUIRY")
    ).toBe("invalid-stripe-status")
  })

  it("leaves non-Stripe order status semantics unchanged", () => {
    expect(validateStripeOrderStatusTransition(null, null, "CANCELLED")).toBe("ok")
    expect(validateStripeOrderStatusTransition(null, null, "CONFIRMED")).toBe("ok")
  })
})
