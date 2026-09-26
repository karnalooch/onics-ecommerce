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
  returnStatus?: "REQUESTED" | "RECEIVED" | "REFUND_PENDING" | "COMPLETED" | null
  returnRequestedAt?: string | null
  returnReceivedAt?: string | null
  returnUpdatedAt?: string | null
  returnCompletedAt?: string | null
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
    const previousRefundFailed =
      order.refundStatus === "failed" || order.refundStatus === "canceled"
    if (!previousRefundFailed) {
      throw new Error("STRIPE_REFUND_ID_MISMATCH")
    }
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
    if (
      order.status === "SHIPPED" &&
      (order.returnStatus === "RECEIVED" ||
        order.returnStatus === "REFUND_PENDING")
    ) {
      order.returnStatus =
        refund.status === "pending" || refund.status === "requires_action"
          ? "REFUND_PENDING"
          : "RECEIVED"
      order.returnUpdatedAt = now
    }
    return refund.status
  }

  // A shipped order can only return stock after the goods were physically
  // received through the explicit RMA flow. A refund created outside this
  // application still reconciles financial truth, but never invents a return.
  if (order.status === "SHIPPED") {
    if (
      order.returnStatus === "RECEIVED" ||
      order.returnStatus === "REFUND_PENDING"
    ) {
      applyStripeRefundInventory(products, order, now)
      order.paymentStatus = "REFUNDED"
      order.status = "RETURNED"
      order.refundedAt = order.refundedAt ?? now
      order.returnStatus = "COMPLETED"
      order.returnUpdatedAt = now
      order.returnCompletedAt = order.returnCompletedAt ?? now
      return "succeeded" as const
    }

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
