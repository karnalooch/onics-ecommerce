import {
  calculateDiscountedUnitPrice,
  clampDiscount,
} from "@/lib/commerce"

export interface PricingFactor {
  tierName: string
  defaultDiscount: number
}

export interface PriceableProduct {
  price?: number | null
}

export const PRICING_MATRIX: Record<string, PricingFactor> = {
  PARTNER: {
    tierName: "PARTNER",
    defaultDiscount: 10,
  },
  VIP: {
    tierName: "VIP",
    defaultDiscount: 20,
  },
  BASIC: {
    tierName: "BASIC",
    defaultDiscount: 5,
  },
}

export function calculateB2BPrice(
  product: PriceableProduct,
  tier: string = "BASIC"
): { price: number; discount: number } {
  const basePrice = Number(product.price)
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return { price: 0, discount: 0 }
  }

  const factor = PRICING_MATRIX[tier] || PRICING_MATRIX.BASIC
  const discount = clampDiscount(factor.defaultDiscount)

  return {
    price: calculateDiscountedUnitPrice({ price: basePrice }, discount),
    discount,
  }
}

export function applyMarkup(price: number, markupPercent: number) {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0
  const safeMarkup = Math.min(1000, Math.max(-100, Number(markupPercent) || 0))
  return Math.round(safePrice * (1 + safeMarkup / 100) * 100) / 100
}

export function calculateServiceCost(
  hours: number,
  difficulty: "STAN" | "EXP" | "IND"
): number {
  const rates = {
    STAN: 150,
    EXP: 250,
    IND: 400,
  }

  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0
  return Math.round(safeHours * rates[difficulty] * 100) / 100
}
