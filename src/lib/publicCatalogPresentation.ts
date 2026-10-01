import type { ProductCatalogRecord } from "@/lib/productCatalogView"
import type { CartItem } from "@/store/cartStore"

export type PublicCatalogProduct = ProductCatalogRecord & { priceHidden?: boolean; imageUrl?: string }
export type CatalogFilters = { query: string; category: string; requestedPage: number }
export type CatalogSearchParams = Record<string, string | string[] | undefined>
export const CATALOG_PAGE_SIZE = 24

export function readCatalogFilters(params: CatalogSearchParams): CatalogFilters {
  const rawPage = typeof params.page === "string" && /^\d+$/.test(params.page) ? Number(params.page) : 1
  return { query: typeof params.q === "string" ? params.q.trim() : "", category: typeof params.category === "string" ? params.category.trim() : "", requestedPage: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1 }
}
export function catalogHref(filters: CatalogFilters, page = 1): string {
  const query = new URLSearchParams()
  if (filters.query) query.set("q", filters.query)
  if (filters.category) query.set("category", filters.category)
  if (page > 1) query.set("page", String(page))
  return `/produkty${query.size ? `?${query}` : ""}`
}
export function paginateCatalog<T>(products: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(products.length / CATALOG_PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1))
  const start = (page - 1) * CATALOG_PAGE_SIZE
  return { items: products.slice(start, start + CATALOG_PAGE_SIZE), page, pages, total: products.length, from: products.length ? start + 1 : 0, to: Math.min(start + CATALOG_PAGE_SIZE, products.length) }
}
export function catalogPriceState(product: PublicCatalogProduct, signedIn: boolean): "visible" | "login" | "restricted" | "unpriced" {
  if (!signedIn) return "login"
  if (product.priceHidden !== false) return "restricted"
  return typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0 ? "visible" : "unpriced"
}
export function toCartProduct(product: PublicCatalogProduct): CartItem {
  return { id: String(product.id), sku: String(product.sku ?? ""), name: String(product.name || "Produkt"), price: Number(product.price ?? 0), quantity: 1 }
}
export function catalogProductHref(product: PublicCatalogProduct, filters: CatalogFilters): string {
  const query = catalogHref(filters, filters.requestedPage).split("?")[1]
  return `/produkty/${encodeURIComponent(product.id)}${query ? `?${query}` : ""}`
}
