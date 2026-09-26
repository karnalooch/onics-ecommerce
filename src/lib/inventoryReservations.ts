export type InventoryProduct = {
  id?: string | null
  sku?: string | null
  stock?: number | null
}

export type InventoryItem = {
  id: string
  quantity: number
}

export type InventoryReservationStatus = "RESERVED" | "FINALIZED" | "RELEASED"

export type InventoryReservationOrder = {
  items?: InventoryItem[]
  inventoryReservationStatus?: InventoryReservationStatus | string | null
  inventoryReservationSource?: "STRIPE" | "ORDER" | string | null
  inventoryReservedAt?: string | null
  inventoryReleasedAt?: string | null
  inventoryFinalizedAt?: string | null
  inventoryReReservedAt?: string | null
  inventoryRefundRestockedAt?: string | null
}

type IncomingPaymentStatus = "PAID" | "FAILED" | "EXPIRED"

function aggregateItems(items: InventoryItem[]) {
  const quantities = new Map<string, number>()

  for (const item of items) {
    const id = String(item.id)
    const quantity = Number(item.quantity)
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error("INVENTORY_INVALID_ITEM")
    }

    const nextQuantity = (quantities.get(id) ?? 0) + quantity
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity > 10000) {
      throw new Error("INVENTORY_INVALID_ITEM")
    }
    quantities.set(id, nextQuantity)
  }

  return quantities
}

function planStockChange(
  products: InventoryProduct[],
  items: InventoryItem[],
  direction: "reserve" | "release"
) {
  const quantities = aggregateItems(items)
  const productsById = new Map(
    products.map((product) => [String(product.id ?? ""), product] as const)
  )
  const changes: Array<{ product: InventoryProduct; stock: number }> = []

  for (const [productId, quantity] of quantities) {
    const product = productsById.get(productId)
    if (!product) throw new Error("INVENTORY_PRODUCT_NOT_FOUND")

    const stock = Number(product.stock ?? 0)
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error("INVENTORY_INVALID_STOCK")
    }

    if (direction === "reserve") {
      if (stock < quantity) throw new Error("INVENTORY_NOT_AVAILABLE")
      changes.push({ product, stock: stock - quantity })
    } else {
      changes.push({ product, stock: stock + quantity })
    }
  }

  return changes
}

export function hasActiveReservationForProduct(
  orders: InventoryReservationOrder[],
  productId: string
) {
  return orders.some(
    (order) =>
      order.inventoryReservationStatus === "RESERVED" &&
      (order.items ?? []).some((item) => String(item.id) === String(productId))
  )
}

export function shouldDeferProductStockWrite(
  orders: InventoryReservationOrder[],
  productId: string,
  currentStock: number | null | undefined,
  incomingStock: number | undefined
) {
  if (incomingStock === undefined) return false
  if (Number(currentStock ?? 0) === Number(incomingStock)) return false
  return hasActiveReservationForProduct(orders, productId)
}

export function reserveInventory(
  products: InventoryProduct[],
  items: InventoryItem[]
) {
  const changes = planStockChange(products, items, "reserve")
  for (const change of changes) change.product.stock = change.stock
}

export function releaseInventory(
  products: InventoryProduct[],
  items: InventoryItem[]
) {
  const changes = planStockChange(products, items, "release")
  for (const change of changes) change.product.stock = change.stock
}

function inventoryQuantities(items: InventoryItem[]) {
  return aggregateItems(items)
}

function inventoryShapeEqual(a: InventoryItem[], b: InventoryItem[]) {
  const left = inventoryQuantities(a)
  const right = inventoryQuantities(b)
  if (left.size !== right.size) return false

  for (const [productId, quantity] of left) {
    if (right.get(productId) !== quantity) return false
  }

  return true
}

export function adjustInventoryReservation(
  products: InventoryProduct[],
  currentItems: InventoryItem[],
  nextItems: InventoryItem[]
) {
  const current = inventoryQuantities(currentItems)
  const next = inventoryQuantities(nextItems)
  const productMap = new Map(
    products.map((product) => [String(product.id ?? ""), product] as const)
  )
  const productIds = new Set([...current.keys(), ...next.keys()])
  const changes: Array<{ product: InventoryProduct; stock: number }> = []

  for (const productId of productIds) {
    const delta = (next.get(productId) ?? 0) - (current.get(productId) ?? 0)
    if (delta === 0) continue

    const product = productMap.get(productId)
    if (!product) throw new Error("INVENTORY_PRODUCT_NOT_FOUND")

    const stock = Number(product.stock ?? 0)
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error("INVENTORY_INVALID_STOCK")
    }

    if (delta > 0 && stock < delta) {
      throw new Error("INVENTORY_NOT_AVAILABLE")
    }

    changes.push({
      product,
      stock: delta > 0 ? stock - delta : stock + Math.abs(delta),
    })
  }

  for (const change of changes) change.product.stock = change.stock
}

export function applyOrderInventoryTransition(
  products: InventoryProduct[],
  order: InventoryReservationOrder,
  nextItems: InventoryItem[],
  nextStatus: string,
  now = new Date().toISOString()
) {
  if (order.inventoryReservationSource !== "ORDER") {
    return "unmanaged" as const
  }

  const reservationStatus = order.inventoryReservationStatus
  if (
    reservationStatus !== "RESERVED" &&
    reservationStatus !== "FINALIZED" &&
    reservationStatus !== "RELEASED"
  ) {
    throw new Error("INVENTORY_RESERVATION_INVALID_STATE")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  if (reservationStatus === "FINALIZED") {
    if (!inventoryShapeEqual(order.items, nextItems)) {
      throw new Error("INVENTORY_FINALIZED_ITEMS_IMMUTABLE")
    }
    return "unchanged" as const
  }

  if (reservationStatus === "RELEASED") {
    if (!inventoryShapeEqual(order.items, nextItems)) {
      throw new Error("INVENTORY_RELEASED_ITEMS_IMMUTABLE")
    }
    return "unchanged" as const
  }

  if (nextStatus === "CANCELLED") {
    if (!inventoryShapeEqual(order.items, nextItems)) {
      throw new Error("INVENTORY_CANCEL_ITEMS_IMMUTABLE")
    }
    releaseInventory(products, order.items)
    order.inventoryReservationStatus = "RELEASED"
    order.inventoryReleasedAt = order.inventoryReleasedAt ?? now
    return "released" as const
  }

  adjustInventoryReservation(products, order.items, nextItems)

  if (nextStatus === "SHIPPED") {
    order.inventoryReservationStatus = "FINALIZED"
    order.inventoryFinalizedAt = order.inventoryFinalizedAt ?? now
    return "finalized" as const
  }

  return "reserved" as const
}

export function applyStripeRefundInventory(
  products: InventoryProduct[],
  order: InventoryReservationOrder,
  now = new Date().toISOString()
) {
  if (order.inventoryRefundRestockedAt) return "unchanged" as const

  // Stripe orders created before inventory reservations existed must not be
  // restocked, because their payment never decremented local stock.
  if (!order.inventoryReservationStatus) {
    return "legacy-unmanaged" as const
  }
  if (order.inventoryReservationSource === "ORDER") {
    throw new Error("INVENTORY_REFUND_INVALID_SOURCE")
  }
  if (order.inventoryReservationStatus === "RELEASED") {
    throw new Error("INVENTORY_REFUND_INVALID_STATE")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  releaseInventory(products, order.items)
  order.inventoryRefundRestockedAt = now
  return "restocked" as const
}

export function applyStripeInventoryTransition(
  products: InventoryProduct[],
  order: InventoryReservationOrder,
  paymentStatus: string,
  incomingStatus: IncomingPaymentStatus,
  now = new Date().toISOString()
) {
  const reservationStatus = order.inventoryReservationStatus

  // A succeeded refund is terminal for inventory. Replayed/out-of-order
  // checkout events must never re-reserve stock after it was returned.
  if (order.inventoryRefundRestockedAt) return "unchanged" as const

  // Orders created before reservation support are intentionally unmanaged.
  if (!reservationStatus) return "legacy-unmanaged" as const
  if (
    reservationStatus !== "RESERVED" &&
    reservationStatus !== "FINALIZED" &&
    reservationStatus !== "RELEASED"
  ) {
    throw new Error("INVENTORY_RESERVATION_INVALID_STATE")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  if (paymentStatus === "PAID") {
    if (reservationStatus === "FINALIZED") return "unchanged" as const

    if (reservationStatus === "RELEASED") {
      reserveInventory(products, order.items ?? [])
      order.inventoryReReservedAt = now
    }

    order.inventoryReservationStatus = "FINALIZED"
    order.inventoryFinalizedAt = order.inventoryFinalizedAt ?? now
    return "finalized" as const
  }

  if (incomingStatus === "FAILED" || incomingStatus === "EXPIRED") {
    if (reservationStatus === "RELEASED") return "unchanged" as const
    if (reservationStatus === "FINALIZED") return "unchanged" as const

    releaseInventory(products, order.items ?? [])
    order.inventoryReservationStatus = "RELEASED"
    order.inventoryReleasedAt = order.inventoryReleasedAt ?? now
    return "released" as const
  }

  return "unchanged" as const
}
