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
