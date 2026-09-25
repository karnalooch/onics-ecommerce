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
import type { CartItem } from "@/store/cartStore"

export const metadata: Metadata = {
  title: "Katalog B2B",
  description:
    "Katalog produktowy CEL-TRONICS — systemy alarmowe, monitoring CCTV, kontrola dostępu, PPOŻ, sieci i osprzęt dla partnerów B2B.",
  alternates: { canonical: "/produkty" },
}

export const revalidate = 0

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type CatalogCategory = string | { name?: string }
type CatalogProduct = {
  id?: string | number
  sku?: string
  name?: string
  price?: number | string | null
  priceHidden?: boolean
  imageUrl?: string
  specs?: string
  manufacturer?: string
  category?: CatalogCategory
  categoryName?: string
  subcategory?: CatalogCategory
  subcategoryName?: string
}

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase()

const getCategoryName = (value: CatalogCategory | undefined) =>
  typeof value === "string" ? value : value?.name

const getCategory = (product: CatalogProduct) =>
  getCategoryName(product.category) ||
  product.categoryName ||
  getCategoryName(product.subcategory) ||
  product.subcategoryName ||
  "Pozostałe"

export default async function ConsumerCatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const session = await auth()
  const params = (await searchParams) ?? {}
  const query = typeof params.q === "string" ? params.q.trim() : ""
  const activeCategory = typeof params.category === "string" ? params.category.trim() : ""

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  let products: CatalogProduct[] = []

  try {
    const response = await fetch(`${baseUrl}/api/products`, { cache: "no-store" })
    const payload: unknown = await response.json()
    products = Array.isArray(payload) ? (payload as CatalogProduct[]) : []
  } catch (error) {
    console.error("Błąd pobierania produktów:", error)
  }

  const categories = Array.from(
    new Set(products.map(getCategory).filter(Boolean))
  ).sort((a, b) => String(a).localeCompare(String(b), "pl"))

  const normalizedQuery = normalize(query)
  const visibleProducts = products.filter((product) => {
    const matchesQuery =
      !normalizedQuery ||
      [product.name, product.sku, product.manufacturer, product.specs]
        .map(normalize)
        .some((value) => value.includes(normalizedQuery))

    const matchesCategory =
      !activeCategory || normalize(getCategory(product)) === normalize(activeCategory)

    return matchesQuery && matchesCategory
  })

  const categoryHref = (category?: string) => {
    const next = new URLSearchParams()
    if (query) next.set("q", query)
    if (category) next.set("category", category)
    const suffix = next.toString()
    return suffix ? `/produkty?${suffix}` : "/produkty"
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
              Katalog produktowy
            </span>
            <h1 className="mt-3 max-w-4xl text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              Znajdź sprzęt do swojego projektu.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-muted-foreground">
              Przeszukuj katalog po nazwie, symbolu lub producencie. Ceny i warunki B2B
              są widoczne zgodnie z uprawnieniami konta.
            </p>
          </div>

          {!session && (
            <Link
              href="/logowanie"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary/10 px-5 text-sm font-extrabold text-primary"
            >
              <LockKeyhole className="h-4 w-4" />
              Ceny partnerskie po zalogowaniu
            </Link>
          )}
        </header>

        <form
          method="get"
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Szukaj po nazwie, SKU lub producencie…"
              className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.02] pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-white/[0.04]"
            />
            {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          </div>
          <button
            type="submit"
            className="h-12 rounded-xl bg-primary px-6 text-sm font-extrabold text-white shadow-lg shadow-primary/15"
          >
            Szukaj
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={categoryHref()}
            className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${
              !activeCategory
                ? "border-[#102033] bg-[#102033] text-white"
                : "border-black/10 bg-white text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"
            }`}
          >
            Wszystkie
          </Link>
          {categories.map((category) => (
            <Link
              key={String(category)}
              href={categoryHref(String(category))}
              className={`rounded-full border px-4 py-2 text-xs font-extrabold transition ${
                normalize(activeCategory) === normalize(category)
                  ? "border-[#102033] bg-[#102033] text-white"
                  : "border-black/10 bg-white text-muted-foreground hover:text-foreground dark:border-white/10 dark:bg-white/[0.04]"
              }`}
            >
              {String(category)}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {visibleProducts.length > 0 ? (
            visibleProducts.map((product: CatalogProduct) => {
              const price = Number(product.price ?? 0)
              const canShowPrice = !product.priceHidden && Number.isFinite(price) && price > 0
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
                  className="grid gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-[84px_1fr] lg:grid-cols-[84px_1fr_180px_210px] lg:items-center"
                >
                  <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-xl bg-black/[0.035] dark:bg-white/[0.05]">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/45" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
                      {product.sku || "Bez SKU"}
                    </span>
                    <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight">
                      {product.name || "Produkt bez nazwy"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">
                      {product.specs || getCategory(product)}
                    </p>
                  </div>

                  <div className="sm:col-start-2 lg:col-auto">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                      Producent
                    </span>
                    <strong className="mt-1 block text-sm">
                      {product.manufacturer || "—"}
                    </strong>
                    <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      w katalogu
                    </span>
                  </div>

                  <div className="sm:col-start-2 lg:col-auto lg:text-right">
                    {canShowPrice ? (
                      <>
                        <strong className="block text-xl">
                          {price.toFixed(2)} PLN
                        </strong>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          cena netto
                        </span>
                        <div className="mt-3 flex lg:justify-end">
                          <AddToCartButton product={cartProduct} />
                        </div>
                      </>
                    ) : (
                      <Link
                        href="/logowanie"
                        className="inline-flex items-center gap-2 rounded-xl bg-black/[0.035] px-4 py-3 text-xs font-extrabold text-muted-foreground transition hover:text-primary dark:bg-white/[0.05]"
                      >
                        <LockKeyhole className="h-4 w-4" />
                        Zaloguj, aby zobaczyć cenę
                      </Link>
                    )}
                  </div>
                </article>
              )
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.04]">
              <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-extrabold">Brak produktów dla wybranych filtrów</h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Zmień wyszukiwaną frazę albo wróć do całego katalogu.
              </p>
              <Link
                href="/produkty"
                className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-primary"
              >
                Wyczyść filtry
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        <footer className="mt-6 flex flex-col justify-between gap-3 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center">
          <span>
            Wyświetlono {visibleProducts.length} z {products.length} produktów
          </span>
          <Link href="/kontakt" className="inline-flex items-center gap-2 text-primary">
            Potrzebujesz pomocy w doborze?
            <ShieldCheck className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </div>
  )
}
