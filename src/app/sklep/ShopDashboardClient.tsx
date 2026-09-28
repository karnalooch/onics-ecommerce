"use client"

import { useMemo, useState } from "react"
import type { StorefrontProduct } from "@/lib/storefrontCatalog"
import { useCartOwnerBinding } from "@/lib/useCartOwnerBinding"
import {
  ShopSidebar,
  type ShopCategory,
} from "./_components/ShopSidebar"
import { ProductGrid } from "./_components/ProductGrid"
import { MiniCart } from "./_components/MiniCart"

interface ShopDashboardClientProps {
  initialProducts: StorefrontProduct[]
  categories: ShopCategory[]
  role: string
  cartOwnerKey: string
}

export function ShopDashboardClient({
  initialProducts,
  categories,
  role,
  cartOwnerKey,
}: ShopDashboardClientProps) {
  const [search, setSearch] = useState("")
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const isB2B = role === "BIZ" || role === "ADMIN"
  const { cartOwnerReady } = useCartOwnerBinding({
    identityKey: cartOwnerKey,
    resolved: true,
  })

  const filteredProducts = useMemo(() => {
    const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean)

    return initialProducts.filter((product) => {
      const haystack = [
        product.name,
        product.sku,
        product.manufacturer,
        product.specs,
        product.catalogSpecs,
        product.seoDescription,
        product.categoryName,
        product.subcategoryName,
      ]
        .map((value) => String(value ?? ""))
        .join(" ")
        .toLowerCase()

      const matchSearch =
        tokens.length === 0 ||
        tokens.every((token) => haystack.includes(token))

      const matchCategory =
        !selectedCatId || String(product.categoryId ?? "") === selectedCatId

      return matchSearch && matchCategory
    })
  }, [initialProducts, search, selectedCatId])

  if (!cartOwnerReady) {
    return (
      <div className="mt-8 flex min-h-[240px] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950 dark:border-slate-700 dark:border-t-white" />
      </div>
    )
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
      <div className="lg:col-span-3 xl:col-span-2">
        <ShopSidebar
          categories={categories}
          selectedCatId={selectedCatId}
          onSelect={setSelectedCatId}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      <main className="min-w-0 lg:col-span-6 xl:col-span-7">
        <ProductGrid products={filteredProducts} isB2B={isB2B} />
      </main>

      <div className="lg:col-span-3">
        <MiniCart isB2B={isB2B} identityKey={cartOwnerKey} />
      </div>
    </div>
  )
}
