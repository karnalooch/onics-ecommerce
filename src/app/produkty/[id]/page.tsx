import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { buildCartOwnerKey } from "@/lib/cartIdentity"
import { catalogHref, readCatalogFilters, type CatalogSearchParams } from "@/lib/publicCatalogPresentation"
import { getProductCatalogDescription } from "@/lib/productCatalogView"
import { loadPublicCatalog } from "../catalog-data"
import { ProductImage } from "@/components/public/ProductImage"
import { CatalogPurchase } from "@/components/public/CatalogPurchase"
import { CatalogUnavailable } from "@/components/public/CatalogUnavailable"
import p from "@/components/public/pages.module.css"
import c from "@/components/public/catalog.module.css"
import s from "@/components/public/public.module.css"

export const metadata: Metadata = { title: "Urządzenie w katalogu", robots: { index: false, follow: true }, alternates: { canonical: null } }
export const revalidate = 0
export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<CatalogSearchParams> }) {
  const { id } = await params
  const filters = readCatalogFilters((await searchParams) ?? {})
  const session = await auth()
  const sessionUser = session?.user as { id?: string; email?: string | null } | undefined
  const cartOwnerKey = buildCartOwnerKey(sessionUser)
  const result = await loadPublicCatalog(sessionUser)
  if (result.status === "error") return <div className={p.page}><h1 className={c.price}>Dane urządzenia</h1><CatalogUnavailable retryHref={`/produkty/${encodeURIComponent(id)}`} reference={result.reference} /></div>
  const product = result.products.find((item) => String(item.id) === id)
  if (!product) notFound()
  return <div className={p.page}>
    <nav className={c.breadcrumbs} aria-label="Ścieżka nawigacji"><Link href={catalogHref(filters, filters.requestedPage)}>Wróć do wyników</Link><span aria-hidden="true">/</span><span>{product.sku || "Urządzenie"}</span></nav>
    <section className={c.detail}>
      <ProductImage src={typeof product.imageUrl === "string" ? product.imageUrl : undefined} large />
      <div><p className={c.sku}>SKU: {product.sku || "Brak SKU"}</p><h1>{product.name || "Urządzenie bez nazwy"}</h1><dl className={c.facts}><dt>Producent</dt><dd>{product.manufacturer || "Brak danych"}</dd><dt>Kategoria</dt><dd>{product.categoryName || "Brak przypisania"}</dd><dt>Podkategoria</dt><dd>{product.subcategoryName || "Brak przypisania"}</dd></dl></div>
      <aside className={c.detailPurchase} aria-label="Warunki konta"><CatalogPurchase product={product} ownerKey={cartOwnerKey} signedIn={Boolean(sessionUser)} /><Link href="/koszyk" className={s.textAction}>Przejdź do wybranych produktów</Link></aside>
    </section>
    <section className={c.fullDescription}><h2>Opis urządzenia</h2><p>{getProductCatalogDescription(product) || "Nie mamy jeszcze opisu tego urządzenia. Skontaktuj się z nami, aby potwierdzić potrzebne parametry."}</p><p className={c.muted}>Opis pochodzi z danych katalogowych. Nie jest oznaczeniem zatwierdzonej procedury montażu.</p><Link href="/kontakt" className={s.textAction}>Zapytaj o urządzenie</Link></section>
  </div>
}
