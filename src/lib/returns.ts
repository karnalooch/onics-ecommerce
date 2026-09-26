import {
  applyStripeRefundInventory,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import type { StripeCancelableOrder } from "@/lib/refunds"

export type ReturnStatus =
  | "REQUESTED"
  | "RECEIVED"
  | "REFUND_PENDING"
  | "COMPLETED"

export type StripeReturnOrder = StripeCancelableOrder & {
  returnStatus?: ReturnStatus | null
  returnRequestedAt?: string | null
  returnReceivedAt?: string | null
  returnUpdatedAt?: string | null
  returnCompletedAt?: string | null
}

export function requestShippedReturn(
  order: StripeReturnOrder,
  now = new Date().toISOString()
) {
  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }

  if (order.status !== "SHIPPED") {
    throw new Error("RETURN_INVALID_ORDER_STATUS")
  }
  if (!order.stripeCheckoutSessionId) {
    throw new Error("RETURN_STRIPE_REQUIRED")
  }
  if (
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED"
  ) {
    throw new Error("RETURN_PAYMENT_INVALID_STATE")
  }

  if (order.returnStatus) {
    return order.returnStatus.toLowerCase() as
      | "requested"
      | "received"
      | "refund_pending"
      | "completed"
  }

  order.returnStatus = "REQUESTED"
  order.returnRequestedAt = order.returnRequestedAt ?? now
  order.returnUpdatedAt = now
  return "requested" as const
}

export function receiveShippedReturn(
  products: InventoryProduct[],
  order: StripeReturnOrder,
  now = new Date().toISOString()
) {
  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }

  if (order.status !== "SHIPPED") {
    throw new Error("RETURN_INVALID_ORDER_STATUS")
  }
  if (
    order.returnStatus !== "REQUESTED" &&
    order.returnStatus !== "RECEIVED" &&
    order.returnStatus !== "REFUND_PENDING"
  ) {
    throw new Error("RETURN_NOT_REQUESTED")
  }

  if (order.returnStatus === "REQUESTED") {
    order.returnStatus = "RECEIVED"
    order.returnReceivedAt = order.returnReceivedAt ?? now
    order.returnUpdatedAt = now
  }

  if (order.paymentStatus === "REFUNDED") {
    applyStripeRefundInventory(products, order, now)
    order.status = "RETURNED"
    order.returnStatus = "COMPLETED"
    order.returnUpdatedAt = now
    order.returnCompletedAt = order.returnCompletedAt ?? now
    return "completed" as const
  }

  if (order.paymentStatus !== "PAID") {
    throw new Error("RETURN_PAYMENT_INVALID_STATE")
  }

  return order.returnStatus === "REFUND_PENDING"
    ? ("refund_pending" as const)
    : ("received" as const)
}
