import type { Przelewy24StoredOrder } from "@/lib/przelewy24"

export type Przelewy24ReconciliationOrder = Przelewy24StoredOrder & {
  id: string
}

export function shouldReconcilePrzelewy24Order(
  order: Przelewy24ReconciliationOrder
) {
  if (!order.p24SessionId) return false

  const paymentUnresolved =
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED" &&
    order.paymentStatus !== "EXPIRED"

  const stagedVerification = Boolean(order.p24VerificationPending)
  const refundUnresolved = order.refundStatus === "pending"

  return paymentUnresolved || stagedVerification || refundUnresolved
}
