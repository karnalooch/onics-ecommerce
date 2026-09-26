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
  inventoryReservationStatus?: InventoryReservationStatus | null
  inventoryReservedAt?: string | null
  inventoryReleasedAt?: string | null
  inventoryFinalizedAt?: string | null
  inventoryReReservedAt?: string | null
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

export function applyStripeInventoryTransition(
  products: InventoryProduct[],
  order: InventoryReservationOrder,
  paymentStatus: string,
  incomingStatus: IncomingPaymentStatus,
  now = new Date().toISOString()
) {
  const reservationStatus = order.inventoryReservationStatus

  // Orders created before reservation support are intentionally unmanaged.
  if (!reservationStatus) return "legacy-unmanaged" as const

  if (paymentStatus === "PAID") {
    if (reservationStatus === "FINALIZED") return "unchanged" as const

    if (reservationStatus === "RELEASED") {
      reserveInventory(products, order.items ?? [])
      order.inventoryReReservedAt = now
    } else if (reservationStatus !== "RESERVED") {
      throw new Error("INVENTORY_RESERVATION_INVALID_STATE")
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
