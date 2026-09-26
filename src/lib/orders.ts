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
  nextStatus: OrderStatus
):
  | "ok"
  | "payment-required"
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
    (nextStatus === "CONFIRMED" && currentStatus !== "PENDING_VERIFICATION") ||
    (nextStatus === "SHIPPED" && currentStatus !== "CONFIRMED") ||
    nextStatus === "PENDING_VERIFICATION"
  ) {
    return "invalid-transition"
  }

  return "ok"
}
