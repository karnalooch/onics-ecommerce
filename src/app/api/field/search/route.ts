import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  buildProductCatalogView,
  getProductCatalogDescription,
  type ProductCatalogCategory,
  type ProductCatalogRecord,
  type ProductCatalogUser,
} from "@/lib/productCatalogView"
import { getKnowledge } from "@/lib/knowledge/parser"
import {
  extractTechnicalFacts,
  extractVerifiedProcedure,
  scoreFieldProduct,
} from "@/lib/fieldProduct"

export const dynamic = "force-dynamic"

const MAX_QUERY_LENGTH = 120
const MAX_RESULTS = 30

export async function GET(req: Request) {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined

  if (!sessionUser) {
    return NextResponse.json({ error: "Brak aktywnej sesji." }, { status: 401 })
  }

  const { users, products, categories } = initializeMockData()
  const currentUser = findStoredUserBySession(
    users as ProductCatalogUser[],
    sessionUser
  )

  const role = currentUser?.roleType
  const allowed =
    currentUser &&
    !currentUser.isBlocked &&
    (role === "ADMIN" || (role === "BIZ" && currentUser.isApproved))

  if (!allowed) {
    return NextResponse.json(
      { error: "Brak dostępu do trybu instalatora." },
      { status: 403 }
    )
  }

  const url = new URL(req.url)
  const query = String(url.searchParams.get("q") || "").trim()
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Zapytanie jest zbyt długie." },
      { status: 400 }
    )
  }

  const requestedLimit = Number(url.searchParams.get("limit") || 20)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_RESULTS, Math.max(1, Math.trunc(requestedLimit)))
    : 20

  const catalog = await buildProductCatalogView(
    products as ProductCatalogRecord[],
    users as ProductCatalogUser[],
    categories as ProductCatalogCategory[],
    sessionUser
  )

  const knowledge = await getKnowledge().catch(() => null)
  const sourceBySku = new Map(
    Object.entries(knowledge?.knowledge || {}).map(([sku, entry]) => [
      sku.trim().toLowerCase(),
      entry.source || null,
    ])
  )

  const ranked = catalog
    .map((product) => {
      const description = getProductCatalogDescription(product) || ""
      return {
        product,
        description,
        score: scoreFieldProduct(
          {
            ...product,
            description,
          },
          query
        ),
      }
    })
    .filter((entry) => entry.score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.product.stock || 0) - Number(left.product.stock || 0) ||
        String(left.product.sku).localeCompare(String(right.product.sku), "pl")
    )

  const items = ranked.slice(0, limit).map(({ product, description }) => ({
    id: String(product.id),
    sku: String(product.sku),
    name: String(product.name || product.sku),
    manufacturer: String(product.manufacturer || "Nieznany"),
    categoryName: product.categoryName || null,
    subcategoryName: product.subcategoryName || null,
    price:
      product.priceHidden || product.price == null
        ? null
        : Number(product.price),
    priceHidden: Boolean(product.priceHidden),
    stock: Math.max(0, Number(product.stock || 0)),
    description,
    facts: extractTechnicalFacts(description),
    procedure: extractVerifiedProcedure(description),
    source: sourceBySku.get(String(product.sku).trim().toLowerCase()) || null,
  }))

  return NextResponse.json({
    query,
    total: ranked.length,
    items,
  })
}
