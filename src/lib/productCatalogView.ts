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
  seoDescription?: string
  catalogPrice?: number | null
  catalogSpecs?: string
  isVirtual?: boolean
  isIqSynced?: boolean
  [key: string]: unknown
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

export async function buildUnifiedProductCatalog(
  productStore: ProductCatalogRecord[]
): Promise<ProductCatalogRecord[]> {
  try {
    const store = await getKnowledge()
    const existingSkus = new Set(
      productStore.map((product) => normalize(product.sku))
    )

    const virtualDevices: ProductCatalogRecord[] = Object.keys(store.knowledge)
      .filter((key) => !existingSkus.has(normalize(key)))
      .map((key) => {
        const entry = store.knowledge[key]
        return {
          id: `virtual_${key}`,
          sku: key,
          name: entry.model || key,
          manufacturer: entry.manufacturer || "NIEZNANY",
          price: 0,
          catalogPrice: entry.price || 0,
          stock: 0,
          isVirtual: true,
          seoDescription: entry.specs || "",
          catalogSpecs: entry.specs || "",
        }
      })

    const enrichedProducts = productStore.map((product) => {
      const entry = store.knowledge[product.sku]
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

    return [...enrichedProducts, ...virtualDevices]
  } catch {
    return [...productStore]
  }
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
  sessionUser?: SessionIdentity
) {
  const unifiedProducts = await buildUnifiedProductCatalog(products)
  return projectProductCatalogForSession(unifiedProducts, users, sessionUser)
}
