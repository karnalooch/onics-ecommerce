import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  LockKeyhole,
  Package,
  Search,
  ShieldCheck,
} from "lucide-react"
import { auth } from "@/auth"
import { AddToCartButton } from "@/components/ui/AddToCartButton"
import { initializeMockData } from "@/store/serverStore"
import {
  buildCatalogCategoryOptions,
  buildProductCatalogView,
  getProductCatalogDescription,
  matchesCatalogCategory,
  matchesProductCatalogQuery,
  type ProductCatalogCategory,
  type ProductCatalogRecord,
  type ProductCatalogUser,
} from "@/lib/productCatalogView"
import type { CartItem } from "@/store/cartStore"
import { buildCartOwnerKey } from "@/lib/cartIdentity"

export const metadata: Metadata = {
  title: "Katalog B2B",
  description:
    "Katalog produktowy CEL-TRONICS — systemy alarmowe, monitoring CCTV, kontrola dostępu, PPOŻ, sieci i osprzęt dla partnerów B2B.",
  alternates: { canonical: "/produkty" },
}

export const revalidate = 0

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type CatalogProduct = ProductCatalogRecord & {
  priceHidden?: boolean
  imageUrl?: string
  specs?: string
}

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase()

const getCategoryLabel = (product: CatalogProduct) =>
  product.subcategoryName || product.categoryName || "Pozostałe"

export default async function ConsumerCatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined
  const cartOwnerKey = buildCartOwnerKey(sessionUser)
  const params = (await searchParams) ?? {}
  const query = typeof params.q === "string" ? params.q.trim() : ""
  const activeCategory =
    typeof params.category === "string" ? params.category.trim() : ""

  let products: CatalogProduct[] = []

  try {
    const {
      products: storedProducts,
      users,
      categories: storedCategories,
    } = initializeMockData()
    products = (await buildProductCatalogView(
      storedProducts as ProductCatalogRecord[],
      users as ProductCatalogUser[],
      storedCategories as ProductCatalogCategory[],
      sessionUser
    )) as CatalogProduct[]
  } catch (error) {
    console.error("Błąd pobierania produktów:", error)
  }

  const categories = buildCatalogCategoryOptions(products)
  const visibleProducts = products.filter(
    (product) =>
      matchesProductCatalogQuery(product, query) &&
      matchesCatalogCategory(product, activeCategory)
  )

  const categoryHref = (category?: string) => {
    const next = new URLSearchParams()
    if (query) next.set("q", query)
    if (category) next.set("category", category)
    const suffix = next.toString()
    return suffix ? `/produkty?${suffix}` : "/produkty"
  }

  return (
    <div className="bg-[#f6f6f3]">
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-7 lg:py-16">
        <header className="grid gap-6 border-b border-[#d9dbdc] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-base font-semibold text-primary">Katalog urządzeń</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-5xl">
              Sprzęt do instalacji i serwisu.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Szukaj po nazwie, SKU, producencie albo kategorii. Ceny konta i funkcje
              zakupowe są udostępniane zgodnie z rolą i zatwierdzeniem partnera.
            </p>
          </div>

          {!session ? (
            <Link
              href="/logowanie"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d5d7d8] bg-white px-4 text-[15px] font-semibold text-slate-800"
            >
              <LockKeyhole className="h-4 w-4 text-primary" />
              Zaloguj się po ceny partnera
            </Link>
          ) : null}
        </header>

        <form method="get" className="mt-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Nazwa, SKU, producent, parametr techniczny…"
              className="h-13 w-full rounded-lg border border-[#cfd2d4] bg-white pl-12 pr-4 text-base text-slate-950 outline-none focus:border-primary"
            />
            {activeCategory ? <input type="hidden" name="category" value={activeCategory} /> : null}
          </div>
          <button
            type="submit"
            className="min-h-13 rounded-lg bg-primary px-6 text-base font-semibold text-white hover:bg-[#a9161c]"
          >
            Szukaj
          </button>
        </form>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-[#d9dbdc]" aria-label="Kategorie katalogu">
          <Link
            href={categoryHref()}
            className={
              "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold " +
              (!activeCategory
                ? "border-primary text-slate-950"
                : "border-transparent text-slate-600 hover:text-slate-950")
            }
          >
            Wszystkie
          </Link>
          {categories.map((category) => {
            const active =
              normalize(activeCategory) === normalize(category.id) ||
              normalize(activeCategory) === normalize(category.name)
            return (
              <Link
                key={category.id}
                href={categoryHref(category.id)}
                className={
                  "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold " +
                  (active
                    ? "border-primary text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-950")
                }
              >
                {category.name}
              </Link>
            )
          })}
        </nav>

        <div className="mt-5 border border-[#d9dbdc] bg-white">
          <div className="hidden grid-cols-[96px_minmax(0,1fr)_190px_150px_190px] gap-4 border-b border-[#d9dbdc] bg-[#f1f1ee] px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 lg:grid">
            <span>Produkt</span>
            <span>Identyfikacja</span>
            <span>Klasyfikacja</span>
            <span>Dostępność</span>
            <span className="text-right">Cena / akcja</span>
          </div>

          {visibleProducts.length > 0 ? (
            <div className="divide-y divide-[#e0e1e1]">
              {visibleProducts.map((product: CatalogProduct) => {
                const price = Number(product.price ?? 0)
                const stock = Number(product.stock ?? 0)
                const canShowPrice =
                  !product.priceHidden && Number.isFinite(price) && price > 0
                const cartProduct: CartItem = {
                  id: String(product.id ?? product.sku ?? product.name ?? "product"),
                  sku: String(product.sku ?? ""),
                  name: String(product.name ?? "Produkt"),
                  price: Number.isFinite(price) ? price : 0,
                  quantity: 1,
                }

                return (
                  <article
                    key={product.id ?? product.sku}
                    className="grid gap-4 p-4 lg:grid-cols-[96px_minmax(0,1fr)_190px_150px_190px] lg:items-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-[#e0e1e1] bg-[#fafaf8]">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-primary">
                        {product.sku || "Bez SKU"}
                      </div>
                      <h2 className="mt-1 text-lg font-semibold leading-6 text-slate-950">
                        {product.name || "Produkt bez nazwy"}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {getProductCatalogDescription(product) || getCategoryLabel(product)}
                      </p>
                    </div>

                    <div className="text-sm leading-6">
                      <div className="font-semibold text-slate-900">
                        {product.manufacturer || "Producent nieokreślony"}
                      </div>
                      <div className="text-slate-600">{getCategoryLabel(product)}</div>
                    </div>

                    <div className="text-sm">
                      {canShowPrice ? (
                        <>
                          <div className="font-semibold text-slate-950">
                            {Number.isFinite(stock) ? `${stock} szt.` : "—"}
                          </div>
                          <div className="mt-1 text-slate-500">stan katalogowy</div>
                        </>
                      ) : (
                        <div className="text-slate-600">Po zalogowaniu</div>
                      )}
                    </div>

                    <div className="lg:text-right">
                      {canShowPrice ? (
                        <>
                          <strong className="block text-lg font-semibold text-slate-950">
                            {price.toFixed(2)} PLN
                          </strong>
                          <span className="mt-1 block text-xs text-slate-500">netto</span>
                          <div className="mt-3 flex lg:justify-end">
                            <AddToCartButton product={cartProduct} ownerKey={cartOwnerKey} />
                          </div>
                        </>
                      ) : (
                        <Link
                          href="/logowanie"
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d7d9da] px-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                        >
                          <LockKeyhole className="h-4 w-4 text-primary" />
                          Pokaż cenę
                        </Link>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="p-10 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-4 text-xl font-semibold text-slate-950">
                Brak produktów dla wybranych filtrów
              </h2>
              <p className="mt-2 text-base text-slate-600">
                Zmień wyszukiwaną frazę albo wróć do całego katalogu.
              </p>
              <Link href="/produkty" className="mt-5 inline-flex items-center gap-2 font-semibold text-primary">
                Wyczyść filtry
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <footer className="mt-5 flex flex-col justify-between gap-3 text-sm text-slate-600 sm:flex-row sm:items-center">
          <span>Wyświetlono {visibleProducts.length} z {products.length} produktów</span>
          <Link href="/kontakt" className="inline-flex items-center gap-2 font-semibold text-primary">
            Potrzebujesz pomocy w doborze?
            <ShieldCheck className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </div>
  )
}
