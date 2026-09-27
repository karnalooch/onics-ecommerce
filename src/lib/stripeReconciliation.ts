import type { StripeCancelableOrder } from "@/lib/refunds"
import {
  isStripeCheckoutCreationRetrySafe,
} from "@/lib/stripeCheckoutCreation"

export type StripeReconciliationOrder = StripeCancelableOrder & {
  paymentProvider?: string | null
  createdAt?: string | null
  paymentCheckoutRegistrationStatus?: string | null
}

export type StripeCheckoutReconciliationState =
  | "PAID"
  | "EXPIRED"
  | "OPEN"
  | "FINALIZING"

export function classifyStripeCheckoutForReconciliation(session: {
  status?: string | null
  payment_status?: string | null
}): StripeCheckoutReconciliationState {
  if (session.payment_status === "paid") return "PAID"
  if (session.status === "expired") return "EXPIRED"
  if (session.status === "complete") return "FINALIZING"
  return "OPEN"
}

export function isStagedStripeCheckout(
  order: StripeReconciliationOrder
) {
  return (
    !order.stripeCheckoutSessionId &&
    order.paymentProvider === "STRIPE" &&
    order.paymentCheckoutRegistrationStatus === "PENDING" &&
    order.status === "PENDING_VERIFICATION" &&
    order.paymentStatus === "PENDING" &&
    order.inventoryReservationSource === "STRIPE" &&
    order.inventoryReservationStatus === "RESERVED"
  )
}

export function isStripeStagedRecoveryWithinIdempotencyWindow(
  order: StripeReconciliationOrder,
  nowMs = Date.now()
) {
  if (!isStagedStripeCheckout(order)) return false

  return isStripeCheckoutCreationRetrySafe(order, nowMs)
}

export function shouldReconcileStripeOrder(
  order: StripeReconciliationOrder
) {
  if (!order.stripeCheckoutSessionId) {
    return isStagedStripeCheckout(order)
  }

  if (
    order.stripeRefundId &&
    order.refundStatus !== "succeeded"
  ) {
    return true
  }

  return (
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED" &&
    order.paymentStatus !== "EXPIRED"
  )
}
