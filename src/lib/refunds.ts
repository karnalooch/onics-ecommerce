import {
  applyStripeInventoryTransition,
  applyStripeRefundInventory,
  type InventoryProduct,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"
import {
  verifyStripeRefund,
  type StripeRefundSnapshot,
} from "@/lib/payments"

export type StripeRefundStatus =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "canceled"

export type StripeCancelableOrder = InventoryReservationOrder & {
  id: string
  status?: string | null
  totalPriceFinal?: number | null
  paymentStatus?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeRefundId?: string | null
  refundStatus?: string | null
  refundRequestedAt?: string | null
  refundUpdatedAt?: string | null
  refundedAt?: string | null
  cancelledAt?: string | null
}

export type RefundSnapshot = StripeRefundSnapshot & {
  status: StripeRefundStatus
}

export function applyStripeRefundSnapshot(
  products: InventoryProduct[],
  order: StripeCancelableOrder,
  refund: RefundSnapshot,
  now = new Date().toISOString()
) {
  const verification = verifyStripeRefund(
    {
      id: order.id,
      totalPriceFinal: Number(order.totalPriceFinal ?? 0),
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: order.stripePaymentIntentId,
      paymentStatus: order.paymentStatus,
    },
    refund
  )
  if (!verification.ok) throw new Error(verification.reason)

  if (order.stripeRefundId && order.stripeRefundId !== refund.refundId) {
    throw new Error("STRIPE_REFUND_ID_MISMATCH")
  }

  // A succeeded refund is terminal. Older pending/created events can arrive
  // later and must not reopen a refunded order.
  if (
    order.paymentStatus === "REFUNDED" ||
    order.refundStatus === "succeeded"
  ) {
    order.stripeRefundId = order.stripeRefundId ?? refund.refundId
    return "succeeded" as const
  }

  order.stripeRefundId = refund.refundId
  order.refundStatus = refund.status
  order.refundRequestedAt = order.refundRequestedAt ?? now
  order.refundUpdatedAt = now

  if (refund.status !== "succeeded") {
    return refund.status
  }

  // A refund can be created outside this application. If the order has
  // already shipped, reconcile the financial truth without pretending the
  // goods returned to inventory or cancelling the shipment record.
  if (order.status === "SHIPPED") {
    order.paymentStatus = "REFUNDED"
    order.refundedAt = order.refundedAt ?? now
    return "succeeded" as const
  }

  applyStripeRefundInventory(products, order, now)
  order.paymentStatus = "REFUNDED"
  order.status = "CANCELLED"
  order.refundedAt = order.refundedAt ?? now
  order.cancelledAt = order.cancelledAt ?? now
  return "succeeded" as const
}

export function applyExpiredCheckoutCancellation(
  products: InventoryProduct[],
  order: StripeCancelableOrder,
  now = new Date().toISOString()
) {
  if (
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "REFUNDED" ||
    order.inventoryReservationStatus === "FINALIZED"
  ) {
    throw new Error("STRIPE_CANCEL_PAYMENT_ALREADY_FINAL")
  }

  if (
    order.status === "CANCELLED" &&
    order.paymentStatus === "EXPIRED"
  ) {
    return "unchanged" as const
  }

  applyStripeInventoryTransition(
    products,
    order,
    "EXPIRED",
    "EXPIRED",
    now
  )

  order.paymentStatus = "EXPIRED"
  order.status = "CANCELLED"
  order.cancelledAt = order.cancelledAt ?? now
  return "cancelled" as const
}
