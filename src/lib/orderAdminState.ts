import { createHash } from "node:crypto"

export type AdminOrderItemSnapshot = {
  id: string
  sku: string
  name: string
  quantity: number
  price: number
}

export type AdminOrderEditableSnapshot = {
  status?: string | null
  estimatedDeliveryDays?: number | null
  items?: AdminOrderItemSnapshot[]
}

function canonicalizeOrderState(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeOrderState)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0
        )
        .map(([key, entry]) => [key, canonicalizeOrderState(entry)])
    )
  }

  return value
}

export function buildAdminOrderStateToken(order: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeOrderState(order)))
    .digest("hex")
}

function orderItemsEqual(
  left: AdminOrderItemSnapshot[],
  right: AdminOrderItemSnapshot[]
) {
  if (left.length !== right.length) return false

  return left.every((item, index) => {
    const other = right[index]
    return (
      other?.id === item.id &&
      other.sku === item.sku &&
      other.name === item.name &&
      other.quantity === item.quantity &&
      other.price === item.price
    )
  })
}

export function isAdminOrderUpdateReplay(
  current: AdminOrderEditableSnapshot,
  requested: AdminOrderEditableSnapshot
) {
  const requestedDeliveryDays =
    requested.estimatedDeliveryDays === undefined
      ? current.estimatedDeliveryDays ?? null
      : requested.estimatedDeliveryDays
  const currentDeliveryDays = current.estimatedDeliveryDays ?? null
  const requestedItems = requested.items ?? current.items ?? []
  const currentItems = current.items ?? []

  return (
    String(current.status ?? "") === String(requested.status ?? "") &&
    requestedDeliveryDays === currentDeliveryDays &&
    orderItemsEqual(requestedItems, currentItems)
  )
}
