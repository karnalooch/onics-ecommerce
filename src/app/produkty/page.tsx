import type { Metadata } from "next"
import Link from "next/link"
import { auth } from "@/auth"
import { buildCartOwnerKey } from "@/lib/cartIdentity"
import { buildCatalogCategoryOptions, getProductCatalogDescription, matchesCatalogCategory, matchesProductCatalogQuery } from "@/lib/productCatalogView"
import { catalogHref, catalogProductHref, paginateCatalog, readCatalogFilters, type CatalogFilters, type CatalogSearchParams, type PublicCatalogProduct } from "@/lib/publicCatalogPresentation"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import { ProductImage } from "@/components/public/ProductImage"
import { CatalogPurchase } from "@/components/public/CatalogPurchase"
import { CatalogUnavailable } from "@/components/public/CatalogUnavailable"
import { loadPublicCatalog } from "./catalog-data"
import p from "@/components/public/pages.module.css"
import c from "@/components/public/catalog.module.css"
import s from "@/components/public/public.module.css"

export const metadata: Metadata = { title: "Katalog urządzeń", description: "Katalog CEL-TRONICS — urządzenia do instalacji, ceny konta i obsługa partnerów.", alternates: { canonical: "/produkty" } }
export const revalidate = 0

function CatalogFiltersForm({ filters, categories }: { filters: CatalogFilters; categories: Array<{ id: string; name: string }> }) {
  const matched = categories.find((item) => item.id.toLowerCase() === filters.category.toLowerCase() || item.name.toLowerCase() === filters.category.toLowerCase())
  return <form method="get" action="/produkty" className={c.search} role="search" aria-label="Wyszukiwanie katalogu">
    <label htmlFor="catalog-query">Szukaj urządzenia<input id="catalog-query" name="q" type="search" defaultValue={filters.query} placeholder="Nazwa, SKU, producent…" /></label>
    <label htmlFor="catalog-category">Kategoria<select id="catalog-category" name="category" defaultValue={matched?.id ?? filters.category}><option value="">Wszystkie kategorie</option>{filters.category && !matched && <option value={filters.category}>{filters.category}</option>}{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <button type="submit" className={s.primaryAction}>Szukaj</button>
  </form>
}
function ProductRow({ product, filters, cartOwnerKey, signedIn }: { product: PublicCatalogProduct; filters: CatalogFilters; cartOwnerKey: string | null; signedIn: boolean }) {
  return <article className={c.row}>
    <ProductImage src={typeof product.imageUrl === "string" ? product.imageUrl : undefined} />
    <div className={c.identity}><p className={c.sku}>SKU: {product.sku || "Brak SKU"}</p><h2><Link href={catalogProductHref(product, filters)}>{product.name || "Produkt bez nazwy"}</Link></h2><p className={c.muted}>{product.manufacturer || "Producent nieokreślony"} · {product.subcategoryName || product.categoryName || "Pozostałe"}</p><p className={c.description}>{getProductCatalogDescription(product) || "Opis nie jest jeszcze dostępny."}</p></div>
    <CatalogPurchase product={product} ownerKey={cartOwnerKey} signedIn={signedIn} />
  </article>
}
function EmptyCatalog({ hasFilters }: { hasFilters: boolean }) {
  return <section className={c.empty}><h2>{hasFilters ? "Brak produktów dla wybranych filtrów" : "Katalog nie zawiera jeszcze produktów"}</h2><p>{hasFilters ? "Zmień frazę lub kategorię. Możesz też skontaktować się z nami w sprawie urządzenia." : "Skontaktuj się z CEL-TRONICS w sprawie potrzebnego sprzętu."}</p><div className={s.actions}>{hasFilters && <Link href="/produkty" className={s.partnerAction}>Wyczyść filtry</Link>}<Link href="/kontakt" className={s.textAction}>Pomoc w doborze</Link></div></section>
}
function Pagination({ filters, page, pages }: { filters: CatalogFilters; page: number; pages: number }) {
  return <nav className={c.pagination} aria-label="Strony katalogu">{page > 1 && <Link href={catalogHref(filters, page - 1)} className={s.partnerAction} rel="prev">Poprzednia strona</Link>}<span>Strona {page} z {pages}</span>{page < pages && <Link href={catalogHref(filters, page + 1)} className={s.partnerAction} rel="next">Następna strona</Link>}</nav>
}
export default async function ConsumerCatalogPage({ searchParams }: { searchParams?: Promise<CatalogSearchParams> }) {
  const session = await auth()
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined
  const cartOwnerKey = buildCartOwnerKey(sessionUser)
  const filters = readCatalogFilters((await searchParams) ?? {})
  const result = await loadPublicCatalog(sessionUser)
  const products = result.status === "ready" ? result.products : []
  const visible = products.filter((product) => matchesProductCatalogQuery(product, filters.query) && matchesCatalogCategory(product, filters.category))
  const pagination = paginateCatalog(visible, filters.requestedPage)
  const activeFilters = { ...filters, requestedPage: pagination.page }
  return <div className={p.page}>
    <PublicPageHeading eyebrow="Katalog urządzeń" title={<>Sprzęt do instalacji.<br />Dane do decyzji.</>}>Znajdź urządzenie po nazwie, SKU, producencie lub kategorii. Ceny i funkcje zakupowe pozostają zgodne z aktualnymi uprawnieniami konta.</PublicPageHeading>
    <CatalogFiltersForm filters={filters} categories={buildCatalogCategoryOptions(products)} />
    {result.status === "error" ? <CatalogUnavailable retryHref={catalogHref(filters, filters.requestedPage)} reference={result.reference} /> : <>
      <div className={c.toolbar}><span>Wyniki {pagination.from}–{pagination.to} z {pagination.total}</span><div><Link href="/koszyk" className={s.textAction}>Wybrane produkty</Link>{(filters.query || filters.category) && <Link href="/produkty" className={s.textAction}>Wyczyść filtry</Link>}</div></div>
      {pagination.items.length ? <div className={c.list}>{pagination.items.map((product) => <ProductRow key={product.id} product={product} filters={activeFilters} cartOwnerKey={cartOwnerKey} signedIn={Boolean(sessionUser)} />)}</div> : <EmptyCatalog hasFilters={Boolean(filters.query || filters.category)} />}
      {pagination.total > 0 && <Pagination filters={filters} page={pagination.page} pages={pagination.pages} />}
    </>}
    <p className={p.note}>Potrzebujesz pomocy? <Link href="/kontakt" className={s.textAction}>Porozmawiaj z CEL-TRONICS</Link></p>
  </div>
}
