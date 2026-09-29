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
      <div className="flex min-h-[280px] items-center justify-center border border-[#d9dbdc] bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <>
      <label className="relative block">
        <span className="sr-only">Szukaj w katalogu</span>
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Model, SKU lub producent…"
          className="h-13 w-full rounded-lg border border-[#cfd2d4] bg-white pl-12 pr-4 text-base font-medium text-slate-950 outline-none focus:border-primary"
        />
      </label>

      {visibleProducts.length === 0 ? (
        <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#cfd2d4] bg-white p-8 text-center">
          <PackageSearch className="h-7 w-7 text-slate-400" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Brak produktów</h3>
          <p className="mt-1 text-base text-slate-600">
            Zmień frazę wyszukiwania.
          </p>
        </div>
      ) : (
        <section className="mt-4 overflow-hidden border border-[#d9dbdc] bg-white">
          <div className="hidden min-h-11 grid-cols-[130px_minmax(0,1fr)_160px_110px_160px_170px] items-center gap-4 border-b border-[#d9dbdc] bg-[#f1f1ee] px-4 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500 lg:grid">
            <span>SKU</span>
            <span>Produkt</span>
            <span>Producent</span>
            <span>Stan</span>
            <span>Cena</span>
            <span className="text-right">Akcja</span>
          </div>

          <div className="divide-y divide-[#e0e1e1]">
            {visibleProducts.map((product) => {
              const price = Number(product.price ?? 0)
              const available = Number(product.stock ?? 0) > 0
              const needsQuote = product.priceHidden || price <= 0

              return (
                <article
                  key={product.id}
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[130px_minmax(0,1fr)_160px_110px_160px_170px] lg:items-center"
                >
                  <div className="font-mono text-sm font-semibold text-slate-950">
                    {product.sku}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-semibold text-slate-950">
                      {product.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 lg:hidden">
                      {product.manufacturer || "Brak producenta"}
                    </div>
                  </div>

                  <div className="hidden truncate text-sm text-slate-600 lg:block">
                    {product.manufacturer || "—"}
                  </div>

                  <div className="text-sm">
                    <span
                      className={
                        "font-semibold " +
                        (available ? "text-[#16794b]" : "text-slate-500")
                      }
                    >
                      {available
                        ? String(Number(product.stock ?? 0)) + " szt."
                        : "Brak"}
                    </span>
                  </div>

                  <div className="font-mono text-sm font-semibold text-slate-950">
                    {formatPrice(product)}
                  </div>

                  <div className="lg:text-right">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={!needsQuote && (!available || !cartOwnerReady)}
                      className={
                        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 " +
                        (needsQuote
                          ? "bg-slate-700 hover:bg-slate-800"
                          : "bg-primary hover:bg-[#a9161c]")
                      }
                    >
                      <ShoppingCart className="h-4 w-4" />
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
