import { describe, expect, it } from "vitest"
import { isEmergencyShutdownCandidate } from "@/lib/paymentShutdown"
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

describe("payment emergency shutdown", () => {
  it("selects only open non-final Stripe orders", () => {
    expect(isEmergencyShutdownCandidate(order())).toBe(true)
    expect(
      isEmergencyShutdownCandidate(
        order({ paymentStatus: "FAILED" })
      )
    ).toBe(true)
  })

  it("never targets paid, refunded or shipped orders", () => {
    expect(
      isEmergencyShutdownCandidate(order({ paymentStatus: "PAID" }))
    ).toBe(false)
    expect(
      isEmergencyShutdownCandidate(order({ paymentStatus: "REFUNDED" }))
    ).toBe(false)
    expect(
      isEmergencyShutdownCandidate(order({ status: "SHIPPED" }))
    ).toBe(false)
    expect(
      isEmergencyShutdownCandidate(order({ status: "RETURNED" }))
    ).toBe(false)
  })

  it("ignores already cancelled/expired and finalized reservations", () => {
    expect(
      isEmergencyShutdownCandidate(
        order({ status: "CANCELLED", paymentStatus: "EXPIRED" })
      )
    ).toBe(false)
    expect(
      isEmergencyShutdownCandidate(
        order({ inventoryReservationStatus: "FINALIZED" })
      )
    ).toBe(false)
  })

  it("requires a Stripe checkout session", () => {
    expect(
      isEmergencyShutdownCandidate(
        order({ stripeCheckoutSessionId: null })
      )
    ).toBe(false)
  })
})
