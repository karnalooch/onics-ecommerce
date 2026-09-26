import { calculateCustomerUnitPrice } from "@/lib/commerce"
import { getKnowledge } from "@/lib/knowledge/parser"
import {
  findStoredUserBySession,
  type SessionIdentity,
} from "@/lib/sessionIdentity"

export type ProductCatalogRecord = {
  id: string
  sku: string
  name: string
  price?: number | null
  stock?: number | null
  manufacturer?: string
  categoryId?: string | null
  subcategoryId?: string | null
  categoryName?: string | null
  subcategoryName?: string | null
  seoDescription?: string
  specs?: string
  catalogPrice?: number | null
  catalogSpecs?: string
  isVirtual?: boolean
  isIqSynced?: boolean
  [key: string]: unknown
}

export type ProductCatalogSubcategory = {
  id: string
  name: string
}

export type ProductCatalogCategory = {
  id: string
  name: string
  subcategories?: ProductCatalogSubcategory[]
}

export type ProductCatalogUser = {
  id?: string
  email?: string | null
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number | null
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function buildCategoryIndexes(categories: ProductCatalogCategory[]) {
  const byId = new Map(
    categories.map((category) => [String(category.id), category] as const)
  )
  const byName = new Map(
    categories.map((category) => [normalize(category.name), category] as const)
  )
  return { byId, byName }
}

export function projectProductCatalogClassification(
  products: ProductCatalogRecord[],
  categories: ProductCatalogCategory[]
): ProductCatalogRecord[] {
  const { byId } = buildCategoryIndexes(categories)

  return products.map((product) => {
    const category = product.categoryId
      ? byId.get(String(product.categoryId))
      : undefined
    const subcategory =
      category && product.subcategoryId
        ? (category.subcategories ?? []).find(
            (candidate) => String(candidate.id) === String(product.subcategoryId)
          )
        : undefined

    return {
      ...product,
      categoryName: category?.name ?? null,
      subcategoryName: subcategory?.name ?? null,
    }
  })
}

function resolveKnowledgeClassification(
  categoryName: string | undefined,
  subcategoryName: string | undefined,
  categories: ProductCatalogCategory[]
) {
  if (!categoryName) {
    return { categoryId: null, subcategoryId: null }
  }

  const { byName } = buildCategoryIndexes(categories)
  const category = byName.get(normalize(categoryName))
  if (!category) {
    return { categoryId: null, subcategoryId: null }
  }

  const subcategory = subcategoryName
    ? (category.subcategories ?? []).find(
        (candidate) => normalize(candidate.name) === normalize(subcategoryName)
      )
    : undefined

  return {
    categoryId: category.id,
    subcategoryId: subcategory?.id ?? null,
  }
}

export function buildCatalogCategoryOptions(products: ProductCatalogRecord[]) {
  const byId = new Map<string, string>()

  for (const product of products) {
    if (!product.categoryId || !product.categoryName) continue
    byId.set(String(product.categoryId), product.categoryName)
  }

  return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "pl")
  )
}

export function matchesCatalogCategory(
  product: ProductCatalogRecord,
  categoryFilter: string
) {
  const normalizedFilter = normalize(categoryFilter)
  if (!normalizedFilter) return true

  return (
    normalize(product.categoryId) === normalizedFilter ||
    normalize(product.categoryName) === normalizedFilter
  )
}

export function getProductCatalogDescription(product: ProductCatalogRecord) {
  for (const value of [
    product.specs,
    product.catalogSpecs,
    product.seoDescription,
  ]) {
    const description = String(value ?? "").trim()
    if (description) return description
  }

  return null
}

export function matchesProductCatalogQuery(
  product: ProductCatalogRecord,
  query: string
) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return true

  return [
    product.name,
    product.sku,
    product.manufacturer,
    product.specs,
    product.catalogSpecs,
    product.seoDescription,
    product.categoryName,
    product.subcategoryName,
  ]
    .map(normalize)
    .some((value) => value.includes(normalizedQuery))
}

export type ProductCatalogKnowledgeEntry = {
  model?: string
  manufacturer?: string
  category?: string
  subcategory?: string
  price?: number | null
  specs?: string
}

export type ProductCatalogKnowledge = Record<
  string,
  ProductCatalogKnowledgeEntry
>

export function projectProductCatalogKnowledge(
  productStore: ProductCatalogRecord[],
  categories: ProductCatalogCategory[],
  knowledge: ProductCatalogKnowledge,
  options: { includeVirtual: boolean }
): ProductCatalogRecord[] {
  const knowledgeBySku = new Map(
    Object.entries(knowledge).map(([sku, entry]) => [
      normalize(sku),
      { sku, entry },
    ])
  )
  const existingSkus = new Set(
    productStore.map((product) => normalize(product.sku))
  )

  const enrichedProducts = productStore.map((product) => {
    const knowledgeMatch = knowledgeBySku.get(normalize(product.sku))
    const entry = knowledgeMatch?.entry
    if (!entry) return product

    return {
      ...product,
      manufacturer:
        product.manufacturer && product.manufacturer !== "NIEZNANY"
          ? product.manufacturer
          : entry.manufacturer || "NIEZNANY",
      catalogSpecs: entry.specs || "",
      catalogPrice: entry.price || 0,
      isIqSynced: true,
    }
  })

  const virtualDevices: ProductCatalogRecord[] = options.includeVirtual
    ? Array.from(knowledgeBySku.values())
        .filter(({ sku }) => !existingSkus.has(normalize(sku)))
        .map(({ sku, entry }) => {
          const classification = resolveKnowledgeClassification(
            entry.category,
            entry.subcategory,
            categories
          )

          return {
            id: `virtual_${sku}`,
            sku,
            name: entry.model || sku,
            manufacturer: entry.manufacturer || "NIEZNANY",
            price: 0,
            catalogPrice: entry.price || 0,
            stock: 0,
            isVirtual: true,
            seoDescription: entry.specs || "",
            catalogSpecs: entry.specs || "",
            ...classification,
          }
        })
    : []

  return projectProductCatalogClassification(
    [...enrichedProducts, ...virtualDevices],
    categories
  )
}

async function buildProductCatalogFromKnowledge(
  productStore: ProductCatalogRecord[],
  categories: ProductCatalogCategory[],
  includeVirtual: boolean
): Promise<ProductCatalogRecord[]> {
  try {
    const store = await getKnowledge()
    return projectProductCatalogKnowledge(
      productStore,
      categories,
      store.knowledge,
      { includeVirtual }
    )
  } catch {
    return projectProductCatalogClassification([...productStore], categories)
  }
}

export async function buildStoredProductCatalog(
  productStore: ProductCatalogRecord[],
  categories: ProductCatalogCategory[]
): Promise<ProductCatalogRecord[]> {
  return buildProductCatalogFromKnowledge(productStore, categories, false)
}

export async function buildUnifiedProductCatalog(
  productStore: ProductCatalogRecord[],
  categories: ProductCatalogCategory[]
): Promise<ProductCatalogRecord[]> {
  return buildProductCatalogFromKnowledge(productStore, categories, true)
}

export function projectProductCatalogForSession(
  products: ProductCatalogRecord[],
  users: ProductCatalogUser[],
  sessionUser?: SessionIdentity
) {
  const currentUser = sessionUser
    ? findStoredUserBySession(users, sessionUser)
    : undefined
  const role = currentUser?.isBlocked ? undefined : currentUser?.roleType
  const canSeePrices =
    role === "ADMIN" || (role === "BIZ" && Boolean(currentUser?.isApproved))

  if (!canSeePrices) {
    return products.map((product) => ({
      ...product,
      price: null,
      catalogPrice: null,
      priceHidden: true,
    }))
  }

  return products.map((product) => ({
    ...product,
    price:
      role === "BIZ"
        ? calculateCustomerUnitPrice(
            {
              id: product.id,
              sku: product.sku,
              name: product.name,
              price: Number(product.price ?? 0),
              stock: Number(product.stock ?? 0),
            },
            {
              role: "BIZ",
              discount: Number(currentUser?.discount ?? 0),
            }
          )
        : Number(product.price ?? 0),
    priceHidden: false,
  }))
}

export async function buildProductCatalogView(
  products: ProductCatalogRecord[],
  users: ProductCatalogUser[],
  categories: ProductCatalogCategory[],
  sessionUser?: SessionIdentity
) {
  const unifiedProducts = await buildUnifiedProductCatalog(products, categories)
  return projectProductCatalogForSession(unifiedProducts, users, sessionUser)
}
