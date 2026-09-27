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

export function catalogCategoryRevision(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0
}

export function nextCatalogCategoryRevision(value: unknown) {
  return catalogCategoryRevision(value) + 1
}

export type CatalogCategoryNameRecord = {
  id?: string | null
  name?: string | null
}

export function normalizeCatalogCategoryName(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function findCatalogCategoryByName<
  T extends CatalogCategoryNameRecord,
>(categories: T[], name: unknown) {
  const normalizedName = normalizeCatalogCategoryName(name)
  if (!normalizedName) return undefined

  return categories.find(
    (category) =>
      normalizeCatalogCategoryName(category.name) === normalizedName
  )
}

export function hasCatalogCategoryNameConflict(
  categories: CatalogCategoryNameRecord[],
  name: unknown,
  excludedId?: string | null
) {
  const normalizedName = normalizeCatalogCategoryName(name)
  if (!normalizedName) return false

  return categories.some(
    (category) =>
      String(category.id ?? "") !== String(excludedId ?? "") &&
      normalizeCatalogCategoryName(category.name) === normalizedName
  )
}

export type CatalogCategoryCreateRecord = CatalogCategoryNameRecord & {
  iconName?: string | null
  subcategories?: Array<{ name?: string | null }>
}

function normalizeCategoryIcon(value: unknown) {
  return String(value ?? "Folder").trim() || "Folder"
}

function normalizedSubcategoryNames(
  values: Array<{ name?: string | null }> | undefined
) {
  return (values || []).map((subcategory) =>
    String(subcategory.name ?? "").trim().toLowerCase()
  )
}

export function isCatalogCategoryCreateReplay(
  existing: CatalogCategoryCreateRecord,
  requested: CatalogCategoryCreateRecord
) {
  if (
    normalizeCatalogCategoryName(existing.name) !==
      normalizeCatalogCategoryName(requested.name) ||
    normalizeCategoryIcon(existing.iconName) !==
      normalizeCategoryIcon(requested.iconName)
  ) {
    return false
  }

  const currentSubcategories = normalizedSubcategoryNames(
    existing.subcategories
  )
  const requestedSubcategories = normalizedSubcategoryNames(
    requested.subcategories
  )

  return (
    currentSubcategories.length === requestedSubcategories.length &&
    currentSubcategories.every(
      (name, index) => name === requestedSubcategories[index]
    )
  )
}

export function indexCatalogCategoriesByName<
  T extends CatalogCategoryNameRecord,
>(categories: T[]) {
  const index = new Map<string, T>()

  for (const category of categories) {
    const name = normalizeCatalogCategoryName(category.name)
    if (!name) continue
    if (index.has(name)) {
      throw new Error("CATALOG_DUPLICATE_CATEGORY_NAME")
    }
    index.set(name, category)
  }

  return index
}

export type WfMagCatalogImportItem = {
  sku?: string | null
  name?: string | null
  price?: number | null
  stock?: number | null
  manufacturer?: string | null
  specs?: string | null
  [key: string]: unknown
}

export function buildWfMagCatalogProduct(
  item: WfMagCatalogImportItem,
  options: {
    id: string
    categoryId?: string | null
    subcategoryId?: string | null
  }
) {
  const sku = String(item.sku ?? "").trim()
  const name = String(item.name ?? "").trim()

  return {
    id: options.id,
    sku,
    name: name || sku || "Produkt",
    price: Number(item.price ?? 0),
    stock: Number(item.stock ?? 0),
    manufacturer: String(item.manufacturer ?? "").trim(),
    categoryId: options.categoryId ?? null,
    subcategoryId: options.subcategoryId ?? null,
    specs: String(item.specs ?? ""),
    seoDescription: "",
  }
}


export type CatalogManufacturerRecord = {
  id: string
  name: string
}

export type CatalogManufacturerReference = {
  manufacturer?: string | null
}

function normalizeManufacturerReference(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function hasManufacturerProductReference(
  products: CatalogManufacturerReference[],
  manufacturerName: unknown
) {
  const normalizedName = normalizeManufacturerReference(manufacturerName)
  if (!normalizedName) return false

  return products.some(
    (product) =>
      normalizeManufacturerReference(product.manufacturer) === normalizedName
  )
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

export type CatalogSubcategoryNameRecord = {
  id?: string | null
  name?: string | null
}

export function normalizeCatalogSubcategoryName(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function hasCatalogSubcategoryNameConflict(
  subcategories: CatalogSubcategoryNameRecord[],
  name: unknown,
  excludedId?: string | null
) {
  const normalizedName = normalizeCatalogSubcategoryName(name)
  if (!normalizedName) return false

  return subcategories.some(
    (subcategory) =>
      String(subcategory.id ?? "") !== String(excludedId ?? "") &&
      normalizeCatalogSubcategoryName(subcategory.name) === normalizedName
  )
}

export function indexCatalogSubcategoriesByName<
  T extends CatalogSubcategoryNameRecord,
>(subcategories: T[]) {
  const index = new Map<string, T>()

  for (const subcategory of subcategories) {
    const name = normalizeCatalogSubcategoryName(subcategory.name)
    if (!name) continue
    if (index.has(name)) {
      throw new Error("CATALOG_DUPLICATE_SUBCATEGORY_NAME")
    }
    index.set(name, subcategory)
  }

  return index
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

export function hasSubcategoryProductReference(
  products: CatalogCategoryReference[],
  categoryId: unknown,
  subcategoryId: unknown
) {
  const normalizedCategoryId = normalizeCatalogReference(categoryId)
  const normalizedSubcategoryId = normalizeCatalogReference(subcategoryId)
  if (!normalizedCategoryId || !normalizedSubcategoryId) return false

  return products.some(
    (product) =>
      normalizeCatalogReference(product.categoryId) === normalizedCategoryId &&
      normalizeCatalogReference(product.subcategoryId) ===
        normalizedSubcategoryId
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

