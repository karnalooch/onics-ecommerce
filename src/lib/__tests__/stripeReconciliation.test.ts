import { describe, expect, it } from "vitest"
import {
  STRIPE_STAGED_RECOVERY_MAX_AGE_MS,
  classifyStripeCheckoutForReconciliation,
  isStagedStripeCheckout,
  isStripeStagedRecoveryWithinIdempotencyWindow,
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

  it("selects only explicitly staged Stripe registrations without a session", () => {
    const staged = order({
      paymentProvider: "STRIPE",
      stripeCheckoutSessionId: null,
      paymentCheckoutRegistrationStatus: "PENDING",
      createdAt: "2026-09-27T06:00:00.000Z",
    })

    expect(isStagedStripeCheckout(staged)).toBe(true)
    expect(shouldReconcileStripeOrder(staged)).toBe(true)

    expect(
      shouldReconcileStripeOrder(
        order({
          paymentProvider: "STRIPE",
          stripeCheckoutSessionId: null,
          paymentCheckoutRegistrationStatus: "READY",
        })
      )
    ).toBe(false)

    expect(
      shouldReconcileStripeOrder(
        order({
          paymentProvider: "PRZELEWY24",
          stripeCheckoutSessionId: null,
          paymentCheckoutRegistrationStatus: "PENDING",
        })
      )
    ).toBe(false)
  })

  it("limits automatic staged recovery to less than 23 hours", () => {
    const now = Date.parse("2026-09-27T12:00:00.000Z")
    const staged = order({
      paymentProvider: "STRIPE",
      stripeCheckoutSessionId: null,
      paymentCheckoutRegistrationStatus: "PENDING",
      createdAt: new Date(now - STRIPE_STAGED_RECOVERY_MAX_AGE_MS + 1).toISOString(),
    })

    expect(
      isStripeStagedRecoveryWithinIdempotencyWindow(staged, now)
    ).toBe(true)

    expect(
      isStripeStagedRecoveryWithinIdempotencyWindow(
        {
          ...staged,
          createdAt: new Date(
            now - STRIPE_STAGED_RECOVERY_MAX_AGE_MS
          ).toISOString(),
        },
        now
      )
    ).toBe(false)

    expect(
      isStripeStagedRecoveryWithinIdempotencyWindow(
        { ...staged, createdAt: "not-a-date" },
        now
      )
    ).toBe(false)
  })
})
