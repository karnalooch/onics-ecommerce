import { describe, expect, it } from "vitest"
import {
  receiveShippedReturn,
  requestShippedReturn,
  type StripeReturnOrder,
} from "@/lib/returns"

function shippedOrder(): StripeReturnOrder {
  return {
    id: "ORD-RMA-1",
    status: "SHIPPED",
    totalPriceFinal: 100,
    paymentStatus: "PAID",
    stripeCheckoutSessionId: "cs_rma",
    stripePaymentIntentId: "pi_rma",
    items: [{ id: "p1", quantity: 2 }],
    inventoryReservationSource: "STRIPE",
    inventoryReservationStatus: "FINALIZED",
  }
}

describe("RMA lifecycle", () => {
  it("opens RMA only for a shipped Stripe order and is idempotent", () => {
    const order = shippedOrder()

    expect(
      requestShippedReturn(order, "2026-09-26T10:00:00.000Z")
    ).toBe("requested")
    expect(order.returnStatus).toBe("REQUESTED")
    expect(order.returnRequestedAt).toBe("2026-09-26T10:00:00.000Z")

    expect(
      requestShippedReturn(order, "2026-09-26T11:00:00.000Z")
    ).toBe("requested")
    expect(order.returnRequestedAt).toBe("2026-09-26T10:00:00.000Z")
  })

  it("rejects RMA before shipment", () => {
    const order = shippedOrder()
    order.status = "CONFIRMED"

    expect(() => requestShippedReturn(order)).toThrow(
      "RETURN_INVALID_ORDER_STATUS"
    )
  })

  it("records physical receipt without restocking before refund succeeds", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = shippedOrder()
    requestShippedReturn(order)

    expect(
      receiveShippedReturn(
        products,
        order,
        "2026-09-26T12:00:00.000Z"
      )
    ).toBe("received")

    expect(order.status).toBe("SHIPPED")
    expect(order.returnStatus).toBe("RECEIVED")
    expect(order.returnReceivedAt).toBe("2026-09-26T12:00:00.000Z")
    expect(products[0].stock).toBe(3)
  })

  it("restocks exactly once when an external refund already succeeded", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order = shippedOrder()
    order.paymentStatus = "REFUNDED"
    order.refundStatus = "succeeded"
    requestShippedReturn(order)

    expect(receiveShippedReturn(products, order)).toBe("completed")
    expect(products[0].stock).toBe(5)
    expect(order.status).toBe("RETURNED")
    expect(order.returnStatus).toBe("COMPLETED")

    expect(receiveShippedReturn(products, order)).toBe("completed")
    expect(products[0].stock).toBe(5)
  })
})
