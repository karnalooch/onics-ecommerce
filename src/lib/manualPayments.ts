import {
  applyOrderInventoryTransition,
  type InventoryProduct,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"

export type ManualPaymentActor = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export type BankTransferOrder = InventoryReservationOrder & {
  id: string
  status?: string | null
  paymentProvider?: string | null
  paymentStatus?: string | null
  paidAt?: string | null
  paymentUpdatedAt?: string | null
  paymentConfirmedAt?: string | null
  paymentConfirmedBy?: {
    id: string | null
    email: string | null
    name: string | null
  } | null
  refundedAt?: string | null
  manualRefundConfirmedAt?: string | null
  manualRefundConfirmedBy?: {
    id: string | null
    email: string | null
    name: string | null
  } | null
}

function actorSnapshot(actor: ManualPaymentActor) {
  return {
    id: actor.id ? String(actor.id) : null,
    email: actor.email ?? null,
    name: actor.name ?? null,
  }
}

export function confirmBankTransferPayment(
  order: BankTransferOrder,
  actor: ManualPaymentActor,
  now = new Date().toISOString()
) {
  if (order.paymentProvider !== "BANK_TRANSFER") {
    throw new Error("BANK_TRANSFER_REQUIRED")
  }
  if (order.paymentStatus === "REFUNDED") {
    throw new Error("BANK_TRANSFER_ALREADY_REFUNDED")
  }
  if (order.status === "CANCELLED" || order.status === "RETURNED") {
    throw new Error("BANK_TRANSFER_ORDER_TERMINAL")
  }
  if (order.paymentStatus === "PAID") {
    return "unchanged" as const
  }
  if (order.paymentStatus !== "PENDING") {
    throw new Error("BANK_TRANSFER_INVALID_PAYMENT_STATE")
  }

  order.paymentStatus = "PAID"
  order.paidAt = order.paidAt ?? now
  order.paymentUpdatedAt = now
  order.paymentConfirmedAt = order.paymentConfirmedAt ?? now
  order.paymentConfirmedBy =
    order.paymentConfirmedBy ?? actorSnapshot(actor)

  return "confirmed" as const
}

export function confirmBankTransferRefund(
  products: InventoryProduct[],
  order: BankTransferOrder,
  actor: ManualPaymentActor,
  now = new Date().toISOString()
) {
  if (order.paymentProvider !== "BANK_TRANSFER") {
    throw new Error("BANK_TRANSFER_REQUIRED")
  }
  if (order.paymentStatus === "REFUNDED") {
    return "unchanged" as const
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("BANK_TRANSFER_REFUND_REQUIRES_PAID")
  }
  if (order.status === "SHIPPED" || order.status === "RETURNED") {
    throw new Error("BANK_TRANSFER_RMA_REQUIRED")
  }
  if (order.status === "CANCELLED") {
    throw new Error("BANK_TRANSFER_ORDER_TERMINAL")
  }

  applyOrderInventoryTransition(
    products,
    order,
    order.items ?? [],
    "CANCELLED",
    now
  )

  order.paymentStatus = "REFUNDED"
  order.status = "CANCELLED"
  order.refundedAt = order.refundedAt ?? now
  order.paymentUpdatedAt = now
  order.manualRefundConfirmedAt =
    order.manualRefundConfirmedAt ?? now
  order.manualRefundConfirmedBy =
    order.manualRefundConfirmedBy ?? actorSnapshot(actor)

  return "refunded" as const
}
