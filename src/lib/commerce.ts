export type CommerceUser = {
  id?: string
  email?: string | null
  role?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number | null
  nip?: string | null
}

export type CommerceProduct = {
  id: string
  sku: string
  name: string
  price: number | null
  stock?: number | null
}

export type CartItemInput = {
  id: string
  quantity: number
}

export type ResolvedCartItem = {
  id: string
  sku: string
  name: string
  price: number
  quantity: number
}

export function clampDiscount(value: unknown): number {
  const discount = Number(value)
  if (!Number.isFinite(discount)) return 0
  return Math.min(100, Math.max(0, discount))
}

export function calculateCustomerUnitPrice(
  product: CommerceProduct,
  user?: CommerceUser | null
): number {
  const basePrice = Number(product.price)
  if (!Number.isFinite(basePrice) || basePrice < 0) return 0

  if (user?.role !== "BIZ") return roundMoney(basePrice)

  const discount = clampDiscount(user.discount)
  return roundMoney(basePrice * (1 - discount / 100))
}

export function resolveCartItems(
  inputs: CartItemInput[],
  products: CommerceProduct[],
  user?: CommerceUser | null,
  options: { requirePriced?: boolean; requireStock?: boolean } = {}
): { items: ResolvedCartItem[]; total: number } {
  const productMap = new Map(products.map((product) => [String(product.id), product]))
  const items: ResolvedCartItem[] = []

  for (const input of inputs) {
    const quantity = Number(input.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw new Error("Nieprawidłowa ilość produktu.")
    }

    const product = productMap.get(String(input.id))
    if (!product) {
      throw new Error("Produkt nie istnieje w aktualnym katalogu.")
    }

    const price = calculateCustomerUnitPrice(product, user)
    if (options.requirePriced && price <= 0) {
      throw new Error(`Produkt ${product.sku} nie ma aktywnej ceny sprzedaży.`)
    }

    const stock = Number(product.stock ?? 0)
    if (options.requireStock && (!Number.isFinite(stock) || stock < quantity)) {
      throw new Error(`Brak wymaganej ilości produktu ${product.sku}.`)
    }

    items.push({
      id: String(product.id),
      sku: String(product.sku),
      name: String(product.name),
      price,
      quantity,
    })
  }

  return {
    items,
    total: roundMoney(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    ),
  }
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
