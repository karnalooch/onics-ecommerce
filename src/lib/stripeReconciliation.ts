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

type StripeReconciliationOrder = StripeCancelableOrder & {
  paymentCheckoutRegistrationStatus?: string | null
}

export function shouldReconcileStripeOrder(
  order: StripeReconciliationOrder
) {
  if (!order.stripeCheckoutSessionId) {
    return (
      order.paymentStatus === "PENDING" &&
      order.inventoryReservationStatus === "RESERVED" &&
      (order.paymentCheckoutRegistrationStatus === "PENDING" ||
        order.paymentCheckoutRegistrationStatus === "UNCERTAIN")
    )
  }

  if (
    order.stripeRefundId &&
    order.refundStatus !== "succeeded"
  ) {
    return true
  }

  if (
    order.refundRequestedAt &&
    !order.stripeRefundId &&
    order.paymentStatus === "PAID"
  ) {
    return true
  }

  return (
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED" &&
    order.paymentStatus !== "EXPIRED"
  )
}
