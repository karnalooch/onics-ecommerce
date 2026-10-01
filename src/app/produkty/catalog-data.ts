import { initializeMockData } from "@/store/serverStore"
import { buildProductCatalogView, type ProductCatalogRecord, type ProductCatalogUser, type ProductCatalogCategory } from "@/lib/productCatalogView"
import type { SessionIdentity } from "@/lib/sessionIdentity"
import type { PublicCatalogProduct } from "@/lib/publicCatalogPresentation"

export type PublicCatalogResult = { status: "ready"; products: PublicCatalogProduct[] } | { status: "error"; reference: string }

/** Request-scoped server read. Never cache one account's catalog/prices for another. */
export async function loadPublicCatalog(sessionUser?: SessionIdentity): Promise<PublicCatalogResult> {
  try {
    const { products, users, categories } = initializeMockData()
    const view = await buildProductCatalogView(products as ProductCatalogRecord[], users as ProductCatalogUser[], categories as ProductCatalogCategory[], sessionUser)
    return { status: "ready", products: view as PublicCatalogProduct[] }
  } catch (error) {
    const reference = crypto.randomUUID().slice(0, 8)
    console.error("Public catalog read failed", reference, error)
    return { status: "error", reference }
  }
}
