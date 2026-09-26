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


export type CatalogManufacturerRecord = {
  id: string
  name: string
}

export function ensureManufacturerRecord(
  manufacturers: CatalogManufacturerRecord[],
  name: unknown,
  id: string
) {
  const displayName = String(name ?? "").trim()
  if (!displayName) return null

  const normalizedName = displayName.toLowerCase()
  const existing = manufacturers.find(
    (manufacturer) =>
      String(manufacturer.name || "").trim().toLowerCase() === normalizedName
  )
  if (existing) return existing

  const created = { id, name: displayName }
  manufacturers.push(created)
  return created
}
