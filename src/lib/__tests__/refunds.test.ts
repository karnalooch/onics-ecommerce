import { describe, expect, it } from "vitest"
import {
  applyExpiredCheckoutCancellation,
  applyStripeRefundSnapshot,
  type StripeCancelableOrder,
} from "@/lib/refunds"

function paidOrder(): StripeCancelableOrder {
  return {
    id: "ORD-1",
    status: "PENDING_VERIFICATION",
    totalPriceFinal: 100,
    paymentStatus: "PAID",
    stripeCheckoutSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    items: [{ id: "p1", quantity: 2 }],
    inventoryReservationSource: "STRIPE",
    inventoryReservationStatus: "FINALIZED",
  }
}

describe("Stripe refund lifecycle", () => {
  it("records pending refunds without cancelling or restocking", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()

    expect(
      applyStripeRefundSnapshot(
        products,
        order,
        {
          orderId: "ORD-1",
          refundId: "re_1",
          paymentIntentId: "pi_1",
          amount: 10000,
          currency: "pln",
          status: "pending",
        },
        "2026-09-26T08:00:00.000Z"
      )
    ).toBe("pending")

    expect(products[0].stock).toBe(3)
    expect(order.status).toBe("PENDING_VERIFICATION")
    expect(order.paymentStatus).toBe("PAID")
    expect(order.stripeRefundId).toBe("re_1")
  })

  it("cancels and restocks exactly once when the refund succeeds", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()
    const refund = {
      orderId: "ORD-1",
      refundId: "re_1",
      paymentIntentId: "pi_1",
      amount: 10000,
      currency: "pln",
      status: "succeeded" as const,
    }

    expect(
      applyStripeRefundSnapshot(
        products,
        order,
        refund,
        "2026-09-26T09:00:00.000Z"
      )
    ).toBe("succeeded")
    expect(products[0].stock).toBe(5)
    expect(order.status).toBe("CANCELLED")
    expect(order.paymentStatus).toBe("REFUNDED")

    expect(
      applyStripeRefundSnapshot(
        products,
        order,
        refund,
        "2026-09-26T10:00:00.000Z"
      )
    ).toBe("succeeded")
    expect(products[0].stock).toBe(5)
  })

  it("does not reopen a succeeded refund when an older pending event arrives", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()

    applyStripeRefundSnapshot(products, order, {
      orderId: "ORD-1",
      refundId: "re_1",
      paymentIntentId: "pi_1",
      amount: 10000,
      currency: "pln",
      status: "succeeded",
    })

    expect(products[0].stock).toBe(5)

    expect(
      applyStripeRefundSnapshot(products, order, {
        orderId: "ORD-1",
        refundId: "re_1",
        paymentIntentId: "pi_1",
        amount: 10000,
        currency: "pln",
        status: "pending",
      })
    ).toBe("succeeded")

    expect(order.refundStatus).toBe("succeeded")
    expect(order.paymentStatus).toBe("REFUNDED")
    expect(products[0].stock).toBe(5)
  })

  it("records failed refunds without cancelling the paid order", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()

    expect(
      applyStripeRefundSnapshot(products, order, {
        orderId: "ORD-1",
        refundId: "re_1",
        paymentIntentId: "pi_1",
        amount: 10000,
        currency: "pln",
        status: "failed",
      })
    ).toBe("failed")

    expect(products[0].stock).toBe(3)
    expect(order.paymentStatus).toBe("PAID")
    expect(order.status).toBe("PENDING_VERIFICATION")
  })

  it("rejects a different refund id after one is bound to the order", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()
    order.stripeRefundId = "re_existing"

    expect(() =>
      applyStripeRefundSnapshot(products, order, {
        orderId: "ORD-1",
        refundId: "re_other",
        paymentIntentId: "pi_1",
        amount: 10000,
        currency: "pln",
        status: "pending",
      })
    ).toThrow("STRIPE_REFUND_ID_MISMATCH")
  })
})

describe("unpaid Stripe cancellation", () => {
  it("releases reserved stock and cancels an expired checkout exactly once", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order: StripeCancelableOrder = {
      id: "ORD-2",
      status: "PENDING_VERIFICATION",
      totalPriceFinal: 100,
      paymentStatus: "PENDING",
      stripeCheckoutSessionId: "cs_2",
      items: [{ id: "p1", quantity: 2 }],
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "RESERVED",
    }

    expect(
      applyExpiredCheckoutCancellation(
        products,
        order,
        "2026-09-26T08:00:00.000Z"
      )
    ).toBe("cancelled")
    expect(products[0].stock).toBe(5)
    expect(order.status).toBe("CANCELLED")
    expect(order.paymentStatus).toBe("EXPIRED")

    expect(
      applyExpiredCheckoutCancellation(
        products,
        order,
        "2026-09-26T09:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(5)
  })

  it("refuses local expiry after payment or inventory finalization", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = paidOrder()

    expect(() =>
      applyExpiredCheckoutCancellation(products, order)
    ).toThrow("STRIPE_CANCEL_PAYMENT_ALREADY_FINAL")
    expect(products[0].stock).toBe(3)
  })
})
