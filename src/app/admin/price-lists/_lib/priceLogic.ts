export interface PricingFactor {
  tierName: string
  categoryDiscount: Record<string, number>
  manufacturerDiscount: Record<string, number>
  defaultDiscount: number
}

export interface PriceableProduct {
  price?: number | null
  manufacturer?: string | null
  categoryId?: string | null
}

export const PRICING_MATRIX: Record<string, PricingFactor> = {
  PARTNER: {
    tierName: "PARTNER",
    categoryDiscount: {
      sswin: 20,
      cctv: 15,
      kd: 18,
      fire: 10,
    },
    manufacturerDiscount: {
      satel: 25,
      hikvision: 18,
      dahua: 20,
    },
    defaultDiscount: 10,
  },
  VIP: {
    tierName: "VIP",
    categoryDiscount: {
      sswin: 30,
      cctv: 25,
      kd: 28,
      fire: 20,
    },
    manufacturerDiscount: {
      satel: 35,
      hikvision: 28,
      dahua: 30,
    },
    defaultDiscount: 20,
  },
  BASIC: {
    tierName: "BASIC",
    categoryDiscount: {},
    manufacturerDiscount: {},
    defaultDiscount: 5,
  },
}

function clampPercent(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, parsed))
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function normalizePricingCategory(categoryName?: string | null) {
  const category = normalizeText(categoryName)
  if (!category) return null
  if (category.includes("sswin") || category.includes("alarm")) return "sswin"
  if (category.includes("cctv") || category.includes("monitor")) return "cctv"
  if (category.includes("kontrola dostep") || category === "kd") return "kd"
  if (
    category.includes("ppoz") ||
    category.includes("pozar") ||
    category.includes("ssp")
  ) {
    return "fire"
  }
  return category
}

export function calculateB2BPrice(
  product: PriceableProduct,
  tier: string = "BASIC",
  categoryName?: string | null
): { price: number; discount: number } {
  const basePrice = Number(product.price)
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return { price: 0, discount: 0 }
  }

  const factor = PRICING_MATRIX[tier] || PRICING_MATRIX.BASIC
  let discount = clampPercent(factor.defaultDiscount)

  const categoryKey = normalizePricingCategory(categoryName)
  if (categoryKey && factor.categoryDiscount[categoryKey] !== undefined) {
    discount = clampPercent(factor.categoryDiscount[categoryKey])
  }

  const manufacturerKey = normalizeText(product.manufacturer)
  if (
    manufacturerKey &&
    factor.manufacturerDiscount[manufacturerKey] !== undefined
  ) {
    discount = clampPercent(factor.manufacturerDiscount[manufacturerKey])
  }

  return {
    price: Math.round(basePrice * (1 - discount / 100) * 100) / 100,
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
