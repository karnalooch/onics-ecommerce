"use client"

import { useEffect, useMemo, useState } from "react"
import { Database, Loader2, PackageSearch, Search, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useRouter } from "next/navigation"
import { QuoteRequestModal } from "@/components/ui/QuoteRequestModal"

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
}

export function B2BDashboardGrid({ nip, email }: B2BDashboardGridProps) {
  const addItem = useCartStore((state) => state.addItem)
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null)

  useEffect(() => {
    let active = true

    fetch("/api/products", { cache: "no-store" })
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

    return products.filter((product) =>
      [product.name, product.sku, product.manufacturer]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    )
  }, [products, query])

  const handleAddToCart = (product: Product) => {
    const price = Number(product.price ?? 0)
    if (price <= 0) {
      setQuoteProduct(product)
      return
    }

    addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price,
      quantity: 1,
    })
    router.push("/koszyk")
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj po nazwie, SKU lub producencie"
            className="h-12 w-full rounded-xl border border-border bg-background pl-11 pr-4 text-sm font-semibold outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      {visibleProducts.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border text-center">
          <PackageSearch className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-5 text-lg font-extrabold">Brak produktów</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Zmień wyszukiwaną frazę albo sprawdź dane katalogowe w panelu admina.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => {
            const price = Number(product.price ?? 0)
            const available = Number(product.stock ?? 0) > 0

            return (
              <article
                key={product.id}
                className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex h-28 items-center justify-center rounded-2xl bg-muted/40">
                  <Database className="h-10 w-10 text-muted-foreground/25" />
                </div>

                <div className="mt-6 flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                    {product.manufacturer || "Producent"}
                  </div>
                  <h3 className="mt-2 text-lg font-extrabold leading-tight">
                    {product.name}
                  </h3>
                  <div className="mt-2 text-xs font-bold text-muted-foreground">
                    SKU: {product.sku}
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Cena B2B netto
                      </span>
                      <strong className="mt-1 block text-2xl">
                        {price > 0 ? `${price.toFixed(2)} PLN` : "Na zapytanie"}
                      </strong>
                    </div>
                    <span className={`text-xs font-bold ${available ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {available ? "Dostępny" : "Brak stanu"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={price > 0 && !available}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {price > 0 ? "Dodaj do koszyka" : "Zapytaj o wycenę"}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {quoteProduct && (
        <QuoteRequestModal
          productId={quoteProduct.id}
          productName={quoteProduct.name}
          companyNip={nip}
          clientEmail={email}
          onClose={() => setQuoteProduct(null)}
        />
      )}
    </>
  )
}
