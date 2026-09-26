import {
  resolveCartItems,
  type CartItemInput,
  type CommerceProduct,
  type CommerceUser,
} from "@/lib/commerce"

export type CartOfferCustomer = CommerceUser & {
  companyName?: string | null
}

export type CartOfferPreview = {
  reference: string
  issuedAt: string
  currency: "PLN"
  customer: {
    companyName: string | null
    nip: string | null
    email: string | null
  }
  items: Array<{
    id: string
    sku: string
    name: string
    quantity: number
    unitPriceNet: number
    lineTotalNet: number
  }>
  totalNet: number
}

export function buildCartOfferPreview(
  inputs: CartItemInput[],
  products: CommerceProduct[],
  user: CartOfferCustomer,
  options: {
    reference: string
    issuedAt: string
  }
): CartOfferPreview {
  const resolved = resolveCartItems(inputs, products, user, {
    requirePriced: true,
    requireStock: false,
  })

  return {
    reference: options.reference,
    issuedAt: options.issuedAt,
    currency: "PLN",
    customer: {
      companyName: user.companyName?.trim() || null,
      nip: user.nip?.trim() || null,
      email: user.email?.trim() || null,
    },
    items: resolved.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPriceNet: item.price,
      lineTotalNet:
        Math.round((item.price * item.quantity + Number.EPSILON) * 100) / 100,
    })),
    totalNet: resolved.total,
  }
}

export function createCartOfferReference(now: Date, randomId: string) {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("")

  const suffix = randomId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()
  if (!suffix) throw new Error("OFFER_REFERENCE_ID_INVALID")

  return `OFF-${date}-${suffix}`
}
