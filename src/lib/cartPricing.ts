export type CartPricingItem = {
  price?: number | null
}

export function hasActiveCartPrice(value: unknown) {
  const price = Number(value)
  return Number.isFinite(price) && price > 0
}

export function cartRequiresPricing(
  items: CartPricingItem[]
) {
  return items.some((item) => !hasActiveCartPrice(item.price))
}
