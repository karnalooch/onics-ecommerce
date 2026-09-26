export type CatalogSkuRecord = {
  id?: string | null
  sku?: string | null
}

export function normalizeSku(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function hasSkuConflict(
  products: CatalogSkuRecord[],
  sku: unknown,
  excludedId?: string | null
) {
  const normalizedSku = normalizeSku(sku)
  if (!normalizedSku) return false

  return products.some(
    (product) =>
      String(product.id ?? "") !== String(excludedId ?? "") &&
      normalizeSku(product.sku) === normalizedSku
  )
}
