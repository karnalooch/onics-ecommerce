import { describe, expect, it } from "vitest"
import {
  classifyStripeCheckoutForReconciliation,
  shouldReconcileStripeOrder,
} from "@/lib/stripeReconciliation"
import type { StripeCancelableOrder } from "@/lib/refunds"

function order(
  overrides: Partial<StripeCancelableOrder> = {}
): StripeCancelableOrder {
  return {
    id: "ORD-1",
    status: "PENDING_VERIFICATION",
    paymentStatus: "PENDING",
    stripeCheckoutSessionId: "cs_1",
    inventoryReservationSource: "STRIPE",
    inventoryReservationStatus: "RESERVED",
    items: [{ id: "p1", quantity: 1 }],
    ...overrides,
  }
}

describe("Stripe payment reconciliation", () => {
  it("classifies source-of-truth checkout states conservatively", () => {
    expect(
      classifyStripeCheckoutForReconciliation({
        status: "complete",
        payment_status: "paid",
      })
    ).toBe("PAID")
    expect(
      classifyStripeCheckoutForReconciliation({
        status: "expired",
        payment_status: "unpaid",
      })
    ).toBe("EXPIRED")
    expect(
      classifyStripeCheckoutForReconciliation({
        status: "complete",
        payment_status: "unpaid",
      })
    ).toBe("FINALIZING")
    expect(
      classifyStripeCheckoutForReconciliation({
        status: "open",
        payment_status: "unpaid",
      })
    ).toBe("OPEN")
  })

  it("selects unresolved checkout states for bulk reconciliation", () => {
    expect(shouldReconcileStripeOrder(order())).toBe(true)
    expect(
      shouldReconcileStripeOrder(order({ paymentStatus: "FAILED" }))
    ).toBe(true)
  })

  it("selects known non-terminal refunds even after payment succeeded", () => {
    expect(
      shouldReconcileStripeOrder(
        order({
          paymentStatus: "PAID",
          stripeRefundId: "re_1",
          refundStatus: "pending",
        })
      )
    ).toBe(true)
  })

  it("skips locally terminal payment states without pending refunds", () => {
    expect(
      shouldReconcileStripeOrder(order({ paymentStatus: "PAID" }))
    ).toBe(false)
    expect(
      shouldReconcileStripeOrder(order({ paymentStatus: "REFUNDED" }))
    ).toBe(false)
    expect(
      shouldReconcileStripeOrder(order({ paymentStatus: "EXPIRED" }))
    ).toBe(false)
  })

  it("requires a Stripe checkout session", () => {
    expect(
      shouldReconcileStripeOrder(
        order({ stripeCheckoutSessionId: null })
      )
    ).toBe(false)
  })
})
