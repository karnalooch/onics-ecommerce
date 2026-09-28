"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, PackageSearch, Search, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useRouter } from "next/navigation"
import { QuoteRequestModal } from "@/components/ui/QuoteRequestModal"
import { useCartOwnerBinding } from "@/lib/useCartOwnerBinding"
import { CART_ITEM_QUANTITY_MAX } from "@/lib/cartQuantity"
import { toast } from "sonner"

type Product = {
  id: string
  sku: string
  name: string
  manufacturer?: string
  price?: number | null
  stock?: number | null
  priceHidden?: boolean
}

interface B2BDashboardGridProps {
  nip: string
  email: string
  ownerKey: string
}

function formatPrice(product: Product) {
  if (product.priceHidden || product.price == null || Number(product.price) <= 0) {
    return "Na zapytanie"
  }

  return (
    Number(product.price).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " zł netto"
  )
}

export function B2BDashboardGrid({
  nip,
  email,
  ownerKey,
}: B2BDashboardGridProps) {
  const addItem = useCartStore((state) => state.addItem)
  const { cartOwnerReady } = useCartOwnerBinding({
    identityKey: ownerKey,
    resolved: true,
  })
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null)

  useEffect(() => {
    let active = true

    void fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Nie udało się pobrać katalogu.")
        return response.json()
      })
      .then((payload) => {
        if (active) setProducts(Array.isArray(payload) ? payload : [])
      })
      .catch(() => {
        if (active) setProducts([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return products

    const tokens = normalized.split(/\s+/).filter(Boolean)
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.sku,
        product.manufacturer,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return tokens.every((token) => haystack.includes(token))
    })
  }, [products, query])

  const handleAddToCart = (product: Product) => {
    const price = Number(product.price ?? 0)
    if (product.priceHidden || price <= 0) {
      setQuoteProduct(product)
      return
    }

    if (!cartOwnerReady) return

    const added = addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price,
      quantity: 1,
    })
    if (!added) {
      toast.error(
        "Maksymalna ilość jednego produktu w koszyku to " +
          String(CART_ITEM_QUANTITY_MAX) +
          " szt."
      )
      return
    }

    router.push("/koszyk")
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <>
      <label className="relative block">
        <span className="sr-only">Szukaj w katalogu</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Model, SKU lub producent…"
          className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm font-medium outline-none focus:border-slate-950 dark:border-slate-700 dark:bg-[#0f1216] dark:focus:border-white"
        />
      </label>

      {visibleProducts.length === 0 ? (
        <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f1216]">
          <PackageSearch className="h-6 w-6 text-slate-400" />
          <h3 className="mt-3 font-semibold">Brak produktów</h3>
          <p className="mt-1 text-sm text-slate-500">
            Zmień frazę wyszukiwania.
          </p>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
          <div className="hidden min-h-11 grid-cols-[130px_minmax(0,1fr)_160px_110px_150px_170px] items-center gap-4 border-b border-slate-200 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 lg:grid">
            <span>SKU</span>
            <span>Produkt</span>
            <span>Producent</span>
            <span>Stan</span>
            <span>Cena</span>
            <span className="text-right">Akcja</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleProducts.map((product) => {
              const price = Number(product.price ?? 0)
              const available = Number(product.stock ?? 0) > 0
              const needsQuote = product.priceHidden || price <= 0

              return (
                <article
                  key={product.id}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[130px_minmax(0,1fr)_160px_110px_150px_170px] lg:items-center"
                >
                  <div className="font-mono text-sm font-semibold">
                    {product.sku}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {product.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 lg:hidden">
                      {product.manufacturer || "Brak producenta"}
                    </div>
                  </div>

                  <div className="hidden truncate text-sm text-slate-500 lg:block">
                    {product.manufacturer || "—"}
                  </div>

                  <div className="text-sm">
                    <span
                      className={
                        "inline-flex rounded-md border px-2 py-1 text-xs font-semibold " +
                        (available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "border-slate-200 text-slate-500 dark:border-slate-800")
                      }
                    >
                      {available
                        ? String(Number(product.stock ?? 0)) + " szt."
                        : "Brak"}
                    </span>
                  </div>

                  <div className="font-mono text-sm font-semibold">
                    {formatPrice(product)}
                  </div>

                  <div className="lg:text-right">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={
                        !needsQuote && (!available || !cartOwnerReady)
                      }
                      className="min-h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
                    >
                      <ShoppingCart className="mr-2 inline h-4 w-4" />
                      {needsQuote ? "Zapytaj" : "Dodaj"}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {quoteProduct ? (
        <QuoteRequestModal
          productId={quoteProduct.id}
          productName={quoteProduct.name}
          companyNip={nip}
          clientEmail={email}
          onClose={() => setQuoteProduct(null)}
        />
      ) : null}
    </>
  )
}
