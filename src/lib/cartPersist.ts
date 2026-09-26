import type { CartItem } from "@/store/cartStore"
import { isValidCartItemQuantity } from "@/lib/cartQuantity"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function sanitizeCartItems(value: unknown): CartItem[] | null {
  if (!Array.isArray(value)) return null

  const seenIds = new Set<string>()
  const items: CartItem[] = []

  for (const candidate of value) {
    if (!isRecord(candidate)) return null

    const id = normalizedText(candidate.id)
    const sku = normalizedText(candidate.sku)
    const name = normalizedText(candidate.name)
    const price = candidate.price
    const quantity = candidate.quantity

    if (
      !id ||
      !sku ||
      !name ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0 ||
      typeof quantity !== "number" ||
      !isValidCartItemQuantity(quantity) ||
      seenIds.has(id)
    ) {
      return null
    }

    seenIds.add(id)
    items.push({ id, sku, name, price, quantity })
  }

  return items
}

export function sanitizePersistedCartState(value: unknown) {
  if (!isRecord(value)) {
    return { ownerKey: null, items: [] as CartItem[] }
  }

  const ownerKey = normalizedText(value.ownerKey) || null
  const items = sanitizeCartItems(value.items) ?? []

  return { ownerKey, items }
}
