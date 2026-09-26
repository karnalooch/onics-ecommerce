import type { StripeCancelableOrder } from "@/lib/refunds"

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

export function shouldReconcileStripeOrder(
  order: StripeCancelableOrder
) {
  if (!order.stripeCheckoutSessionId) return false

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
