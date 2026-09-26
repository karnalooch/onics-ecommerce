export type OrderItemSnapshot = {
  id: string
  sku: string
  name: string
  quantity: number
  price: number
}

export function resolveEstimatedDeliveryDays(
  incoming: number | null | undefined,
  current: number | null | undefined
) {
  return incoming === undefined ? current ?? null : incoming
}

function orderItemsEqual(
  incoming: OrderItemSnapshot[],
  current: OrderItemSnapshot[]
) {
  if (incoming.length !== current.length) return false

  return incoming.every((item, index) => {
    const existing = current[index]
    return (
      existing?.id === item.id &&
      existing.sku === item.sku &&
      existing.name === item.name &&
      existing.quantity === item.quantity &&
      existing.price === item.price
    )
  })
}

export function canReplaceOrderItems(
  stripeCheckoutSessionId: string | null | undefined,
  incoming: OrderItemSnapshot[] | undefined,
  current: OrderItemSnapshot[] | undefined
) {
  if (!stripeCheckoutSessionId || incoming === undefined) return true
  return orderItemsEqual(incoming, current ?? [])
}

export function canReplacePaymentOrderItems(
  paymentProvider: string | null | undefined,
  stripeCheckoutSessionId: string | null | undefined,
  incoming: OrderItemSnapshot[] | undefined,
  current: OrderItemSnapshot[] | undefined
) {
  if (incoming === undefined) return true
  if (
    stripeCheckoutSessionId ||
    paymentProvider === "STRIPE" ||
    paymentProvider === "BANK_TRANSFER"
  ) {
    return orderItemsEqual(incoming, current ?? [])
  }
  return true
}


export type OrderStatus =
  | "PENDING_VERIFICATION"
  | "INQUIRY"
  | "CONFIRMED"
  | "SHIPPED"
  | "CANCELLED"

export function validateStripeOrderStatusTransition(
  stripeCheckoutSessionId: string | null | undefined,
  paymentStatus: string | null | undefined,
  currentStatus: OrderStatus | string | null | undefined,
  nextStatus: OrderStatus,
  refundStatus?: string | null
):
  | "ok"
  | "payment-required"
  | "refund-in-progress"
  | "stripe-cancel-required"
  | "invalid-stripe-status"
  | "invalid-transition" {
  if (!stripeCheckoutSessionId) return "ok"
  if (currentStatus === nextStatus) return "ok"

  if (nextStatus === "CANCELLED") {
    return "stripe-cancel-required"
  }

  if (nextStatus === "INQUIRY") {
    return "invalid-stripe-status"
  }

  if (
    (nextStatus === "CONFIRMED" || nextStatus === "SHIPPED") &&
    paymentStatus !== "PAID"
  ) {
    return "payment-required"
  }

  if (
    (nextStatus === "CONFIRMED" || nextStatus === "SHIPPED") &&
    (refundStatus === "pending" || refundStatus === "requires_action")
  ) {
    return "refund-in-progress"
  }

  if (
    (nextStatus === "CONFIRMED" && currentStatus !== "PENDING_VERIFICATION") ||
    (nextStatus === "SHIPPED" && currentStatus !== "CONFIRMED") ||
    nextStatus === "PENDING_VERIFICATION"
  ) {
    return "invalid-transition"
  }

  return "ok"
}


export function validateReservedOrderStatusTransition(
  inventoryReservationSource: string | null | undefined,
  currentStatus: OrderStatus | string | null | undefined,
  nextStatus: OrderStatus
): "ok" | "invalid-transition" {
  if (inventoryReservationSource !== "ORDER") return "ok"
  if (currentStatus === nextStatus) return "ok"

  if (currentStatus === "PENDING_VERIFICATION") {
    return nextStatus === "CONFIRMED" || nextStatus === "CANCELLED"
      ? "ok"
      : "invalid-transition"
  }

  if (currentStatus === "CONFIRMED") {
    return nextStatus === "SHIPPED" || nextStatus === "CANCELLED"
      ? "ok"
      : "invalid-transition"
  }

  return "invalid-transition"
}

export function validateBankTransferOrderStatusTransition(
  paymentProvider: string | null | undefined,
  paymentStatus: string | null | undefined,
  currentStatus: OrderStatus | string | null | undefined,
  nextStatus: OrderStatus
):
  | "ok"
  | "payment-required"
  | "manual-refund-required"
  | "invalid-bank-transfer-status" {
  if (paymentProvider !== "BANK_TRANSFER") return "ok"
  if (currentStatus === nextStatus) return "ok"

  if (nextStatus === "INQUIRY") {
    return "invalid-bank-transfer-status"
  }

  if (nextStatus === "CANCELLED" && paymentStatus === "PAID") {
    return "manual-refund-required"
  }

  if (
    (nextStatus === "CONFIRMED" || nextStatus === "SHIPPED") &&
    paymentStatus !== "PAID"
  ) {
    return "payment-required"
  }

  return "ok"
}
