export type ProductPricingSnapshot = {
  price?: number | null
  catalogPrice?: number | null
}

function normalizeCatalogPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return null
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) {
    throw new RangeError("KNOWLEDGE_CATALOG_PRICE_INVALID")
  }
  return value
}

export function preserveSalePriceForKnowledgeUpdate(
  existing: ProductPricingSnapshot,
  extractedPrice: number | null
) {
  const catalogPrice =
    extractedPrice === null
      ? normalizeCatalogPrice(existing.catalogPrice)
      : normalizeCatalogPrice(extractedPrice)

  return {
    price: existing.price ?? 0,
    catalogPrice,
  }
}

export function pricingForKnowledgeCreatedProduct(
  extractedPrice: number | null
) {
  return {
    price: 0,
    catalogPrice: normalizeCatalogPrice(extractedPrice),
  }
}
