"use client"

import { Send, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { toast } from "sonner"
import { hasActiveCartPrice } from "@/lib/cartPricing"
import { CART_ITEM_QUANTITY_MAX } from "@/lib/cartQuantity"
import type { StorefrontProduct } from "@/lib/storefrontCatalog"

interface ProductCardProps {
  product: StorefrontProduct
  isB2B: boolean
}

export function ProductCard({ product, isB2B }: ProductCardProps) {
  const { addItem } = useCartStore()
  const hasActivePrice = hasActiveCartPrice(product.price)
  const available = Number(product.stock ?? 0) > 0
  const canAdd = isB2B && (hasActivePrice ? available : true)

  const manufacturer =
    typeof product.manufacturer === "string" ? product.manufacturer : "—"

  const description =
    [product.specs, product.catalogSpecs, product.seoDescription].find(
      (value) => typeof value === "string" && value.trim()
    ) || ""

  const handleAddToCart = () => {
    const added = addItem({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: Number(product.price ?? 0),
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

    toast.success(
      hasActivePrice
        ? "Dodano do wyboru: " + product.name
        : "Dodano do zapytania: " + product.name
    )
  }

  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[120px_minmax(0,1fr)_120px_150px_130px] lg:items-center">
      <div className="font-mono text-sm font-semibold">{product.sku}</div>

      <div className="min-w-0">
        <div className="truncate font-semibold">{product.name}</div>
        <div className="mt-1 text-xs text-slate-500">
          {manufacturer}
          {description ? " · " + String(description) : ""}
        </div>
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
          {available ? String(Number(product.stock ?? 0)) + " szt." : "Brak"}
        </span>
      </div>

      <div className="font-mono text-sm font-semibold">
        {hasActivePrice
          ? Number(product.price).toLocaleString("pl-PL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + " zł netto"
          : "Na zapytanie"}
      </div>

      <div className="lg:text-right">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="min-h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
        >
          {hasActivePrice ? (
            <ShoppingCart className="mr-2 inline h-4 w-4" />
          ) : (
            <Send className="mr-2 inline h-4 w-4" />
          )}
          {hasActivePrice ? "Dodaj" : "Zapytaj"}
        </button>
      </div>
    </article>
  )
}
