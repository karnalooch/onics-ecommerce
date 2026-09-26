import { describe, expect, it } from "vitest"
import {
  canReplaceOrderItems,
  canReplacePaymentOrderItems,
  resolveEstimatedDeliveryDays,
  validateBankTransferOrderStatusTransition,
  validateReservedOrderStatusTransition,
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
      validateStripeOrderStatusTransition("cs_test", "PENDING", "PENDING_VERIFICATION", "CONFIRMED")
    ).toBe("payment-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "FAILED", "CONFIRMED", "SHIPPED")
    ).toBe("payment-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "PENDING_VERIFICATION", "CONFIRMED")
    ).toBe("ok")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "CONFIRMED", "SHIPPED")
    ).toBe("ok")
  })

  it("blocks fulfillment while a Stripe refund is pending", () => {
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "PENDING_VERIFICATION",
        "CONFIRMED",
        "pending"
      )
    ).toBe("refund-in-progress")
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "CONFIRMED",
        "SHIPPED",
        "requires_action"
      )
    ).toBe("refund-in-progress")
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "PENDING_VERIFICATION",
        "CONFIRMED",
        "failed"
      )
    ).toBe("ok")
  })

  it("does not fake Stripe cancellation through a local status change", () => {
    expect(
      validateStripeOrderStatusTransition("cs_test", "PENDING", "PENDING_VERIFICATION", "CANCELLED")
    ).toBe("stripe-cancel-required")
    expect(
      validateStripeOrderStatusTransition("cs_test", "PAID", "CONFIRMED", "CANCELLED")
    ).toBe("stripe-cancel-required")
  })

  it("does not downgrade Stripe orders into inquiry status", () => {
    expect(
      validateStripeOrderStatusTransition("cs_test", "PENDING", "PENDING_VERIFICATION", "INQUIRY")
    ).toBe("invalid-stripe-status")
  })

  it("enforces the Stripe fulfillment sequence without skipping or rollback", () => {
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "PENDING_VERIFICATION",
        "SHIPPED"
      )
    ).toBe("invalid-transition")
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "SHIPPED",
        "CONFIRMED"
      )
    ).toBe("invalid-transition")
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "CONFIRMED",
        "PENDING_VERIFICATION"
      )
    ).toBe("invalid-transition")
    expect(
      validateStripeOrderStatusTransition(
        "cs_test",
        "PAID",
        "SHIPPED",
        "SHIPPED"
      )
    ).toBe("ok")
  })

  it("leaves non-Stripe order status semantics unchanged", () => {
    expect(validateStripeOrderStatusTransition(null, null, "PENDING_VERIFICATION", "CANCELLED")).toBe("ok")
    expect(validateStripeOrderStatusTransition(null, null, "PENDING_VERIFICATION", "CONFIRMED")).toBe("ok")
  })
})


describe("B2B reserved order status transitions", () => {
  it("allows confirmation, shipping, and cancellation before shipment", () => {
    expect(
      validateReservedOrderStatusTransition(
        "ORDER",
        "PENDING_VERIFICATION",
        "CONFIRMED"
      )
    ).toBe("ok")
    expect(
      validateReservedOrderStatusTransition("ORDER", "CONFIRMED", "SHIPPED")
    ).toBe("ok")
    expect(
      validateReservedOrderStatusTransition(
        "ORDER",
        "PENDING_VERIFICATION",
        "CANCELLED"
      )
    ).toBe("ok")
    expect(
      validateReservedOrderStatusTransition("ORDER", "CONFIRMED", "CANCELLED")
    ).toBe("ok")
  })

  it("rejects skips, rollback, and reopening terminal states", () => {
    expect(
      validateReservedOrderStatusTransition(
        "ORDER",
        "PENDING_VERIFICATION",
        "SHIPPED"
      )
    ).toBe("invalid-transition")
    expect(
      validateReservedOrderStatusTransition(
        "ORDER",
        "CONFIRMED",
        "PENDING_VERIFICATION"
      )
    ).toBe("invalid-transition")
    expect(
      validateReservedOrderStatusTransition("ORDER", "SHIPPED", "CONFIRMED")
    ).toBe("invalid-transition")
    expect(
      validateReservedOrderStatusTransition("ORDER", "CANCELLED", "CONFIRMED")
    ).toBe("invalid-transition")
  })

  it("leaves legacy and Stripe order semantics to their existing flows", () => {
    expect(
      validateReservedOrderStatusTransition(
        undefined,
        "PENDING_VERIFICATION",
        "SHIPPED"
      )
    ).toBe("ok")
    expect(
      validateReservedOrderStatusTransition(
        "STRIPE",
        "PENDING_VERIFICATION",
        "SHIPPED"
      )
    ).toBe("ok")
  })
})

describe("bank-transfer order safety", () => {
  const items = [
    {
      id: "p1",
      sku: "SKU-1",
      name: "Produkt",
      quantity: 1,
      price: 100,
    },
  ]

  it("locks the quoted transfer amount once checkout exists", () => {
    expect(
      canReplacePaymentOrderItems(
        "BANK_TRANSFER",
        null,
        [{ ...items[0], price: 120 }],
        items
      )
    ).toBe(false)
    expect(
      canReplacePaymentOrderItems(
        "BANK_TRANSFER",
        null,
        items.map((item) => ({ ...item })),
        items
      )
    ).toBe(true)
  })

  it("keeps ordinary B2B order edits available", () => {
    expect(
      canReplacePaymentOrderItems(
        undefined,
        null,
        [{ ...items[0], price: 120 }],
        items
      )
    ).toBe(true)
  })

  it("requires confirmed funds before bank-transfer fulfillment", () => {
    expect(
      validateBankTransferOrderStatusTransition(
        "BANK_TRANSFER",
        "PENDING",
        "PENDING_VERIFICATION",
        "CONFIRMED"
      )
    ).toBe("payment-required")
    expect(
      validateBankTransferOrderStatusTransition(
        "BANK_TRANSFER",
        "PAID",
        "PENDING_VERIFICATION",
        "CONFIRMED"
      )
    ).toBe("ok")
  })

  it("requires explicit external refund confirmation before cancelling a paid transfer", () => {
    expect(
      validateBankTransferOrderStatusTransition(
        "BANK_TRANSFER",
        "PAID",
        "CONFIRMED",
        "CANCELLED"
      )
    ).toBe("manual-refund-required")
    expect(
      validateBankTransferOrderStatusTransition(
        "BANK_TRANSFER",
        "PENDING",
        "PENDING_VERIFICATION",
        "CANCELLED"
      )
    ).toBe("ok")
  })
})
