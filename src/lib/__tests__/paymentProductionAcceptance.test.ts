import { describe, expect, it } from "vitest"
import {
  applyStripeInventoryTransition,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import {
  applyStripeRefundSnapshot,
  type StripeCancelableOrder,
} from "@/lib/refunds"
import {
  confirmBankTransferReturnRefund,
  type BankTransferReturnOrder,
} from "@/lib/manualReturns"
import {
  applyPrzelewy24RefundNotification,
  applyReconciledPrzelewy24Payment,
  stagePrzelewy24Refund,
  type Przelewy24RefundNotification,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
import { nextPaymentStatus } from "@/lib/payments"

describe("payment production acceptance", () => {
  it("restocks a shipped RMA exactly once for every refund-capable provider", () => {
    const stripeProducts: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const stripeOrder: StripeCancelableOrder = {
      id: "ORD-ACCEPT-STRIPE",
      status: "SHIPPED",
      totalPriceFinal: 100,
      paymentStatus: "PAID",
      stripeCheckoutSessionId: "cs_accept",
      stripePaymentIntentId: "pi_accept",
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "FINALIZED",
      items: [{ id: "p1", quantity: 2 }],
      returnStatus: "RECEIVED",
    }
    const stripeRefund = {
      orderId: stripeOrder.id,
      refundId: "re_accept",
      paymentIntentId: "pi_accept",
      amount: 10000,
      currency: "pln",
      status: "succeeded" as const,
    }

    expect(
      applyStripeRefundSnapshot(
        stripeProducts,
        stripeOrder,
        stripeRefund,
        "2026-09-26T18:00:00.000Z"
      )
    ).toBe("succeeded")
    expect(
      applyStripeRefundSnapshot(
        stripeProducts,
        stripeOrder,
        stripeRefund,
        "2026-09-26T18:05:00.000Z"
      )
    ).toBe("succeeded")
    expect(stripeProducts[0].stock).toBe(10)
    expect(stripeOrder).toMatchObject({
      status: "RETURNED",
      paymentStatus: "REFUNDED",
      returnStatus: "COMPLETED",
    })

    const bankProducts: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const bankOrder: BankTransferReturnOrder = {
      id: "ORD-ACCEPT-BANK",
      status: "SHIPPED",
      paymentProvider: "BANK_TRANSFER",
      paymentStatus: "PAID",
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "FINALIZED",
      items: [{ id: "p1", quantity: 2 }],
      returnStatus: "RECEIVED",
    }

    expect(
      confirmBankTransferReturnRefund(
        bankProducts,
        bankOrder,
        { id: "admin-accept" },
        "2026-09-26T18:10:00.000Z"
      )
    ).toBe("completed")
    expect(
      confirmBankTransferReturnRefund(
        bankProducts,
        bankOrder,
        { id: "admin-other" },
        "2026-09-26T18:15:00.000Z"
      )
    ).toBe("completed")
    expect(bankProducts[0].stock).toBe(10)
    expect(bankOrder).toMatchObject({
      status: "RETURNED",
      paymentStatus: "REFUNDED",
      returnStatus: "COMPLETED",
    })

    const p24Products: InventoryProduct[] = [{ id: "p1", stock: 8 }]
    const p24Order: Przelewy24StoredOrder = {
      id: "ORD-ACCEPT-P24",
      status: "SHIPPED",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 100,
      paymentStatus: "PAID",
      p24SessionId: "ORD-ACCEPT-P24",
      p24OrderId: 987654321,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "FINALIZED",
      items: [{ id: "p1", quantity: 2 }],
      returnStatus: "RECEIVED",
    }
    const staged = stagePrzelewy24Refund(
      p24Order,
      "2026-09-26T18:20:00.000Z"
    )
    const p24Refund: Przelewy24RefundNotification = {
      orderId: 987654321,
      sessionId: "ORD-ACCEPT-P24",
      merchantId: 123456,
      requestId: staged.requestId,
      refundsUuid: staged.refundsUuid,
      amount: 10000,
      currency: "PLN",
      timestamp: 1790430000,
      status: 0,
      sign: "a".repeat(96),
    }

    expect(
      applyPrzelewy24RefundNotification(
        p24Products,
        p24Order,
        p24Refund,
        "2026-09-26T18:25:00.000Z"
      )
    ).toBe("completed")
    expect(
      applyPrzelewy24RefundNotification(
        p24Products,
        p24Order,
        p24Refund,
        "2026-09-26T18:30:00.000Z"
      )
    ).toBe("completed")
    expect(p24Products[0].stock).toBe(10)
    expect(p24Order).toMatchObject({
      status: "RETURNED",
      paymentStatus: "REFUNDED",
      returnStatus: "COMPLETED",
    })
  })

  it("keeps refunded orders terminal when a late payment signal arrives", () => {
    const stripeProducts: InventoryProduct[] = [{ id: "p1", stock: 10 }]
    const stripeOrder: StripeCancelableOrder = {
      id: "ORD-LATE-STRIPE",
      status: "CANCELLED",
      totalPriceFinal: 100,
      paymentStatus: "REFUNDED",
      stripeCheckoutSessionId: "cs_late",
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "FINALIZED",
      inventoryRefundRestockedAt: "2026-09-26T18:00:00.000Z",
      items: [{ id: "p1", quantity: 2 }],
    }

    const stripeStatus = nextPaymentStatus(
      stripeOrder.paymentStatus,
      "PAID"
    )
    expect(stripeStatus).toBe("REFUNDED")
    expect(
      applyStripeInventoryTransition(
        stripeProducts,
        stripeOrder,
        stripeStatus,
        "PAID",
        "2026-09-26T19:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(stripeProducts[0].stock).toBe(10)

    const p24Products: InventoryProduct[] = [{ id: "p1", stock: 10 }]
    const p24Order: Przelewy24StoredOrder = {
      id: "ORD-LATE-P24",
      status: "RETURNED",
      paymentProvider: "PRZELEWY24",
      totalPriceFinal: 100,
      paymentStatus: "REFUNDED",
      p24SessionId: "ORD-LATE-P24",
      p24OrderId: 123456789,
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "FINALIZED",
      inventoryRefundRestockedAt: "2026-09-26T18:00:00.000Z",
      items: [{ id: "p1", quantity: 2 }],
      returnStatus: "COMPLETED",
    }

    expect(
      applyReconciledPrzelewy24Payment(
        p24Products,
        p24Order,
        {
          orderId: 123456789,
          sessionId: "ORD-LATE-P24",
          status: 1,
          amount: 10000,
          currency: "PLN",
        },
        "2026-09-26T19:05:00.000Z"
      )
    ).toBe("unchanged")
    expect(p24Order.paymentStatus).toBe("REFUNDED")
    expect(p24Products[0].stock).toBe(10)
  })

  it("fails closed instead of inflating stock when a late Stripe payment cannot be re-reserved", () => {
    const products: InventoryProduct[] = [{ id: "p1", stock: 1 }]
    const order: StripeCancelableOrder = {
      id: "ORD-LATE-OVERSELL",
      status: "CANCELLED",
      totalPriceFinal: 100,
      paymentStatus: "EXPIRED",
      stripeCheckoutSessionId: "cs_late_oversell",
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "RELEASED",
      items: [{ id: "p1", quantity: 2 }],
    }

    expect(() =>
      applyStripeInventoryTransition(
        products,
        order,
        nextPaymentStatus(order.paymentStatus, "PAID"),
        "PAID",
        "2026-09-26T20:00:00.000Z"
      )
    ).toThrow("INVENTORY_NOT_AVAILABLE")

    expect(products[0].stock).toBe(1)
    expect(order.inventoryReservationStatus).toBe("RELEASED")
  })
})
