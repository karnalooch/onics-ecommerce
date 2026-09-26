import type { StripeCancelableOrder } from "@/lib/refunds"

export function isEmergencyShutdownCandidate(
  order: StripeCancelableOrder
) {
  if (!order.stripeCheckoutSessionId) return false
  if (
    order.status === "CANCELLED" ||
    order.status === "SHIPPED" ||
    order.status === "RETURNED"
  ) {
    return false
  }
  if (
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "REFUNDED" ||
    order.paymentStatus === "EXPIRED"
  ) {
    return false
  }
  if (order.inventoryReservationStatus === "FINALIZED") {
    return false
  }
  return true
}

export type EmergencyShutdownResult =
  | "cancelled"
  | "already-expired"
  | "skipped-paid"
  | "skipped-finalizing"
  | "changed"
  | "failed"
