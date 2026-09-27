import type {
  Przelewy24Notification,
  Przelewy24StoredOrder,
  Przelewy24TransactionDetails,
} from "@/lib/przelewy24"

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


export function classifyPrzelewy24VerificationRecovery(
  transaction: Przelewy24TransactionDetails,
  staged: Przelewy24Notification
) {
  if (
    transaction.sessionId !== staged.sessionId ||
    transaction.orderId !== staged.orderId ||
    transaction.amount !== staged.amount ||
    transaction.currency !== staged.currency
  ) {
    throw new Error("PRZELEWY24_STAGED_TRANSACTION_MISMATCH")
  }

  // P24 transaction details:
  // 0 = no payment, 1 = advance payment, 2 = payment made, 3 = returned.
  // A provider status of 2 is authoritative evidence that verification already
  // committed remotely, so recovery must not depend on replaying verify.
  if (transaction.status === 2) return "provider-paid" as const
  if (transaction.status === 0 || transaction.status === 1) {
    return "verify-required" as const
  }
  if (transaction.status === 3) return "provider-returned" as const

  throw new Error("PRZELEWY24_TRANSACTION_STATUS_UNKNOWN")
}
