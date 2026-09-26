import { calculateCustomerUnitPrice } from "@/lib/commerce"

export type CatalogReadProduct = {
  id: string
  sku: string
  name: string
  price?: number | null
  stock?: number | null
  manufacturer?: string
  categoryId?: string | null
  subcategoryId?: string | null
  specs?: string
  seoDescription?: string
  catalogPrice?: number | null
  catalogSpecs?: string
  isVirtual?: boolean
  isIqSynced?: boolean
  categoryName?: string
  subcategoryName?: string
  [key: string]: unknown
}

export type CatalogReadCategory = {
  id: string
  name: string
  subcategories?: Array<{
    id: string
    name: string
  }>
}

export type CatalogKnowledgeEntry = {
  model?: string
  manufacturer?: string
  price?: number | null
  specs?: string
  category?: string
  subcategory?: string
}

export type CatalogViewer = {
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number | null
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function withClassificationNames(
  product: CatalogReadProduct,
  categoryById: Map<string, CatalogReadCategory>
) {
  const category = categoryById.get(String(product.categoryId ?? ""))
  const subcategory = category?.subcategories?.find(
    (candidate) =>
      String(candidate.id) === String(product.subcategoryId ?? "")
  )

  return {
    ...product,
    ...(category?.name ? { categoryName: category.name } : {}),
    ...(subcategory?.name ? { subcategoryName: subcategory.name } : {}),
  }
}

export function projectCatalogProducts(
  products: CatalogReadProduct[],
  categories: CatalogReadCategory[],
  knowledge: Record<string, CatalogKnowledgeEntry>,
  viewer?: CatalogViewer | null
) {
  const existingSkus = new Set(products.map((product) => normalize(product.sku)))
  const categoryById = new Map(
    categories.map((category) => [String(category.id), category] as const)
  )

  const enrichedProducts = products.map((product) => {
    const entry = knowledge[product.sku]
    const enriched = entry
      ? {
          ...product,
          manufacturer:
            product.manufacturer && product.manufacturer !== "NIEZNANY"
              ? product.manufacturer
              : entry.manufacturer || "NIEZNANY",
          specs: product.specs || entry.specs || "",
          catalogSpecs: entry.specs || "",
          catalogPrice: entry.price || 0,
          isIqSynced: true,
        }
      : { ...product }

    return withClassificationNames(enriched, categoryById)
  })

  const virtualProducts = Object.keys(knowledge)
    .filter((key) => !existingSkus.has(normalize(key)))
    .map((key) => {
      const entry = knowledge[key]
      return {
        id: `virtual_${key}`,
        sku: key,
        name: entry.model || key,
        manufacturer: entry.manufacturer || "NIEZNANY",
        price: 0,
        catalogPrice: entry.price || 0,
        stock: 0,
        isVirtual: true,
        specs: entry.specs || "",
        seoDescription: entry.specs || "",
        catalogSpecs: entry.specs || "",
        ...(entry.category ? { categoryName: entry.category } : {}),
        ...(entry.subcategory ? { subcategoryName: entry.subcategory } : {}),
      } satisfies CatalogReadProduct
    })

  const unifiedProducts = [...enrichedProducts, ...virtualProducts]
  const role = viewer?.isBlocked ? undefined : viewer?.roleType
  const canSeePrices =
    role === "ADMIN" || (role === "BIZ" && Boolean(viewer?.isApproved))

  if (!canSeePrices) {
    return unifiedProducts.map((product) => ({
      ...product,
      price: null,
      catalogPrice: null,
      priceHidden: true,
    }))
  }

  return unifiedProducts.map((product) => ({
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
              discount: Number(viewer?.discount ?? 0),
            }
          )
        : Number(product.price ?? 0),
    priceHidden: false,
  }))
}
