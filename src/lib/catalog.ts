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

export function indexCatalogProductsBySku<T extends CatalogSkuRecord>(
  products: T[]
) {
  const index = new Map<string, T>()

  for (const product of products) {
    const sku = normalizeSku(product.sku)
    if (!sku) continue
    if (index.has(sku)) {
      throw new Error("CATALOG_DUPLICATE_SKU")
    }
    index.set(sku, product)
  }

  return index
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

export type CatalogCategoryReference = {
  categoryId?: string | null
  subcategoryId?: string | null
}

function normalizeCatalogReference(value: unknown) {
  return String(value ?? "").trim()
}

export function hasCategoryProductReference(
  products: CatalogCategoryReference[],
  categoryId: unknown
) {
  const normalizedCategoryId = normalizeCatalogReference(categoryId)
  if (!normalizedCategoryId) return false

  return products.some(
    (product) =>
      normalizeCatalogReference(product.categoryId) === normalizedCategoryId
  )
}

export function findRemovedReferencedSubcategoryIds(
  products: CatalogCategoryReference[],
  categoryId: unknown,
  nextSubcategoryIds: unknown[]
) {
  const normalizedCategoryId = normalizeCatalogReference(categoryId)
  if (!normalizedCategoryId) return []

  const nextIds = new Set(
    nextSubcategoryIds.map(normalizeCatalogReference).filter(Boolean)
  )
  const removed = new Set<string>()

  for (const product of products) {
    if (
      normalizeCatalogReference(product.categoryId) !== normalizedCategoryId
    ) {
      continue
    }

    const subcategoryId = normalizeCatalogReference(product.subcategoryId)
    if (subcategoryId && !nextIds.has(subcategoryId)) {
      removed.add(subcategoryId)
    }
  }

  return [...removed]
}

export type CatalogCategoryDefinition = {
  id?: string | null
  subcategories?: Array<{ id?: string | null }>
}

export type CatalogClassificationErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "SUBCATEGORY_WITHOUT_CATEGORY"
  | "SUBCATEGORY_NOT_FOUND"

export function validateCatalogClassification(
  categories: CatalogCategoryDefinition[],
  categoryId: unknown,
  subcategoryId: unknown
): CatalogClassificationErrorCode | null {
  const normalizedCategoryId = normalizeCatalogReference(categoryId)
  const normalizedSubcategoryId = normalizeCatalogReference(subcategoryId)

  if (!normalizedCategoryId) {
    return normalizedSubcategoryId ? "SUBCATEGORY_WITHOUT_CATEGORY" : null
  }

  const category = categories.find(
    (candidate) =>
      normalizeCatalogReference(candidate.id) === normalizedCategoryId
  )
  if (!category) return "CATEGORY_NOT_FOUND"

  if (
    normalizedSubcategoryId &&
    !(category.subcategories || []).some(
      (candidate) =>
        normalizeCatalogReference(candidate.id) === normalizedSubcategoryId
    )
  ) {
    return "SUBCATEGORY_NOT_FOUND"
  }

  return null
}

export function assertCatalogClassification(
  categories: CatalogCategoryDefinition[],
  categoryId: unknown,
  subcategoryId: unknown
) {
  const error = validateCatalogClassification(
    categories,
    categoryId,
    subcategoryId
  )
  if (error) throw new Error(error)
}

