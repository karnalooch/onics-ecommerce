import {
  releaseInventory,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import type {
  BankTransferOrder,
  ManualPaymentActor,
} from "@/lib/manualPayments"

export type BankTransferReturnOrder = BankTransferOrder & {
  returnStatus?: "REQUESTED" | "RECEIVED" | "COMPLETED" | null
  returnRequestedAt?: string | null
  returnReceivedAt?: string | null
  returnUpdatedAt?: string | null
  returnCompletedAt?: string | null
  inventoryRefundRestockedAt?: string | null
}

function actorSnapshot(actor: ManualPaymentActor) {
  return {
    id: actor.id ? String(actor.id) : null,
    email: actor.email ?? null,
    name: actor.name ?? null,
  }
}

function assertBankTransferReturnOrder(order: BankTransferReturnOrder) {
  if (order.paymentProvider !== "BANK_TRANSFER") {
    throw new Error("BANK_TRANSFER_REQUIRED")
  }
}

export function requestBankTransferReturn(
  order: BankTransferReturnOrder,
  now = new Date().toISOString()
) {
  assertBankTransferReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }
  if (order.status !== "SHIPPED") {
    throw new Error("BANK_TRANSFER_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("BANK_TRANSFER_RETURN_PAYMENT_REQUIRED")
  }

  if (order.returnStatus === "REQUESTED") {
    return "requested" as const
  }
  if (order.returnStatus === "RECEIVED") {
    return "received" as const
  }
  if (order.returnStatus) {
    throw new Error("BANK_TRANSFER_RETURN_INVALID_STATE")
  }

  order.returnStatus = "REQUESTED"
  order.returnRequestedAt = order.returnRequestedAt ?? now
  order.returnUpdatedAt = now
  return "requested" as const
}

export function receiveBankTransferReturn(
  order: BankTransferReturnOrder,
  now = new Date().toISOString()
) {
  assertBankTransferReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }
  if (order.status !== "SHIPPED") {
    throw new Error("BANK_TRANSFER_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("BANK_TRANSFER_RETURN_PAYMENT_REQUIRED")
  }
  if (order.returnStatus === "RECEIVED") {
    return "received" as const
  }
  if (order.returnStatus !== "REQUESTED") {
    throw new Error("BANK_TRANSFER_RETURN_NOT_REQUESTED")
  }

  order.returnStatus = "RECEIVED"
  order.returnReceivedAt = order.returnReceivedAt ?? now
  order.returnUpdatedAt = now
  return "received" as const
}

export function confirmBankTransferReturnRefund(
  products: InventoryProduct[],
  order: BankTransferReturnOrder,
  actor: ManualPaymentActor,
  now = new Date().toISOString()
) {
  assertBankTransferReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED" &&
    order.paymentStatus === "REFUNDED"
  ) {
    return "completed" as const
  }
  if (order.status !== "SHIPPED") {
    throw new Error("BANK_TRANSFER_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("BANK_TRANSFER_RETURN_PAYMENT_REQUIRED")
  }
  if (order.returnStatus !== "RECEIVED") {
    throw new Error("BANK_TRANSFER_RETURN_NOT_RECEIVED")
  }
  if (order.inventoryRefundRestockedAt) {
    throw new Error("BANK_TRANSFER_RETURN_STOCK_ALREADY_RESTOCKED")
  }
  if (order.inventoryReservationStatus !== "FINALIZED") {
    throw new Error("BANK_TRANSFER_RETURN_INVENTORY_NOT_FINALIZED")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  releaseInventory(products, order.items)
  order.inventoryRefundRestockedAt = now
  order.paymentStatus = "REFUNDED"
  order.refundedAt = order.refundedAt ?? now
  order.paymentUpdatedAt = now
  order.manualRefundConfirmedAt =
    order.manualRefundConfirmedAt ?? now
  order.manualRefundConfirmedBy =
    order.manualRefundConfirmedBy ?? actorSnapshot(actor)
  order.status = "RETURNED"
  order.returnStatus = "COMPLETED"
  order.returnUpdatedAt = now
  order.returnCompletedAt = order.returnCompletedAt ?? now

  return "completed" as const
}
