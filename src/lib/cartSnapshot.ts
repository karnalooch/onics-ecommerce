import {
  resolveCartItems,
  type CartItemInput,
  type CommerceProduct,
  type CommerceUser,
} from "@/lib/commerce"

function normalizeAvailableStock(value: unknown) {
  const stock = Number(value)
  if (!Number.isFinite(stock) || stock <= 0) return 0
  return Math.floor(stock)
}

export function buildAuthoritativeCartSnapshot(
  inputs: CartItemInput[],
  products: CommerceProduct[],
  user: CommerceUser
) {
  const resolved = resolveCartItems(inputs, products, user, {
    requirePriced: false,
    requireStock: false,
  })
  const stockByProductId = new Map(
    products.map((product) => [
      String(product.id),
      normalizeAvailableStock(product.stock),
    ])
  )

  return {
    ...resolved,
    items: resolved.items.map((item) => ({
      ...item,
      availableStock: stockByProductId.get(item.id) ?? 0,
    })),
  }
}
