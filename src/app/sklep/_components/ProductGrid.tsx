"use client"

import { PackageSearch } from "lucide-react"
import type { StorefrontProduct } from "@/lib/storefrontCatalog"
import { ProductCard } from "./ProductCard"

interface ProductGridProps {
  products: StorefrontProduct[]
  isB2B: boolean
}

export function ProductGrid({ products, isB2B }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f1216]">
        <PackageSearch className="h-6 w-6 text-slate-400" />
        <h2 className="mt-3 font-semibold">Brak produktów</h2>
        <p className="mt-1 text-sm text-slate-500">
          Zmień kategorię albo frazę wyszukiwania.
        </p>
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
      <div className="hidden min-h-11 grid-cols-[120px_minmax(0,1fr)_120px_150px_130px] items-center gap-4 border-b border-slate-200 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 lg:grid">
        <span>SKU</span>
        <span>Produkt</span>
        <span>Stan</span>
        <span>Cena</span>
        <span className="text-right">Akcja</span>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} isB2B={isB2B} />
        ))}
      </div>
    </section>
  )
}
