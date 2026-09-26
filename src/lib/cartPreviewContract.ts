import type { CartItem } from "@/store/cartStore"
import { isValidCartItemQuantity } from "@/lib/cartQuantity"

export type CartPreviewRequestItem = Pick<CartItem, "id" | "quantity">

export type AuthoritativeCartPreviewItem = {
  cartItem: CartItem
  availableStock: number
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Serwer zwrócił nieprawidłowy podgląd koszyka.")
  }
  return value as Record<string, unknown>
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} koszyka.`)
  }
  return value.trim()
}

function parsePreviewItem(value: unknown): AuthoritativeCartPreviewItem {
  const item = requireRecord(value)
  const id = requireText(item.id, "id")
  const sku = requireText(item.sku, "sku")
  const name = requireText(item.name, "name")
  const price = item.price
  const quantity = item.quantity
  const availableStock = item.availableStock

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new Error("Serwer zwrócił nieprawidłową cenę koszyka.")
  }
  if (
    typeof quantity !== "number" ||
    !isValidCartItemQuantity(quantity)
  ) {
    throw new Error("Serwer zwrócił nieprawidłową ilość produktu.")
  }
  if (
    typeof availableStock !== "number" ||
    !Number.isInteger(availableStock) ||
    availableStock < 0
  ) {
    throw new Error("Serwer zwrócił nieprawidłowy stan magazynowy.")
  }

  return {
    cartItem: {
      id,
      sku,
      name,
      price,
      quantity,
    },
    availableStock,
  }
}

export function validateAuthoritativeCartPreview(
  requestedItems: CartPreviewRequestItem[],
  responseItems: unknown
): AuthoritativeCartPreviewItem[] {
  if (!Array.isArray(responseItems)) {
    throw new Error("Serwer zwrócił nieprawidłowy podgląd koszyka.")
  }

  const expectedQuantityById = new Map<string, number>()
  for (const item of requestedItems) {
    const id = typeof item.id === "string" ? item.id.trim() : ""
    if (
      !id ||
      !isValidCartItemQuantity(item.quantity) ||
      expectedQuantityById.has(id)
    ) {
      throw new Error("Koszyk zawiera nieprawidłowy zestaw pozycji.")
    }
    expectedQuantityById.set(id, item.quantity)
  }

  if (responseItems.length !== requestedItems.length) {
    throw new Error("Serwer zwrócił niepełny podgląd koszyka.")
  }

  const previewById = new Map<string, AuthoritativeCartPreviewItem>()
  for (const value of responseItems) {
    const previewItem = parsePreviewItem(value)
    const { id, quantity } = previewItem.cartItem
    const expectedQuantity = expectedQuantityById.get(id)

    if (expectedQuantity === undefined) {
      throw new Error("Serwer zwrócił nieoczekiwany produkt w podglądzie koszyka.")
    }
    if (previewById.has(id)) {
      throw new Error("Serwer zwrócił zduplikowany produkt w podglądzie koszyka.")
    }
    if (quantity !== expectedQuantity) {
      throw new Error("Serwer zwrócił inną ilość produktu niż wysłana do weryfikacji.")
    }

    previewById.set(id, previewItem)
  }

  return requestedItems.map((item) => {
    const previewItem = previewById.get(item.id.trim())
    if (!previewItem) {
      throw new Error("Serwer nie zwrócił wszystkich pozycji koszyka.")
    }
    return previewItem
  })
}
