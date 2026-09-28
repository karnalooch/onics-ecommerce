"use client"

import { ArrowRight, ShoppingCart, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSyncExternalStore } from "react"
import { useCartStore } from "@/store/cartStore"
import { cartRequiresPricing, hasActiveCartPrice } from "@/lib/cartPricing"
import { useAuthoritativeCart } from "@/lib/useAuthoritativeCart"

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function MiniCart({
  isB2B,
  identityKey,
}: {
  isB2B: boolean
  identityKey: string
}) {
  const router = useRouter()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  )
  const { items: cart, removeItem, getTotalItems, getTotalPrice } =
    useCartStore()
  const { refreshingCart, availableStockById } = useAuthoritativeCart({
    enabled: mounted && isB2B,
    identityKey,
  })

  if (!mounted) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950 dark:border-slate-700 dark:border-t-white" />
      </div>
    )
  }

  const cartCount = getTotalItems()
  const total = getTotalPrice()
  const requiresPricing = cartRequiresPricing(cart)
  const hasStockConflict = cart.some((item) => {
    const availableStock = availableStockById[item.id]
    return (
      hasActiveCartPrice(item.price) &&
      availableStock !== undefined &&
      item.quantity > availableStock
    )
  })

  return (
    <aside className="sticky top-24 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold">Wybrane pozycje</h2>
          <div className="mt-1 font-mono text-xs text-slate-500">
            {cartCount} szt.
          </div>
        </div>
        <ShoppingCart className="h-4 w-4 text-slate-500" />
      </header>

      {cart.length === 0 ? (
        <div className="p-6 text-sm leading-6 text-slate-500">
          Nie wybrano jeszcze żadnych produktów.
        </div>
      ) : (
        <>
          <div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
            {cart.map((item) => {
              const availableStock = availableStockById[item.id]
              const conflict =
                hasActiveCartPrice(item.price) &&
                availableStock !== undefined &&
                item.quantity > availableStock

              return (
                <div key={item.id} className="flex gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-slate-500">
                      <span>× {item.quantity}</span>
                      <span>
                        {hasActiveCartPrice(item.price)
                          ? item.price.toLocaleString("pl-PL", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) + " zł"
                          : "wycena"}
                      </span>
                    </div>
                    {conflict ? (
                      <div className="mt-1 text-xs font-semibold text-red-700 dark:text-red-300">
                        Dostępne: {availableStock} szt.
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                    aria-label={"Usuń " + item.name}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <footer className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Wartość netto</span>
              <span className="text-right font-mono font-semibold">
                {requiresPricing
                  ? total > 0
                    ? total.toLocaleString("pl-PL", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) + " zł + wycena"
                    : "Do wyceny"
                  : total.toLocaleString("pl-PL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) + " zł"}
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {hasStockConflict
                ? "Część ilości przekracza bieżący stan magazynowy."
                : requiresPricing
                  ? "Część pozycji wymaga indywidualnej wyceny."
                  : "Ceny dotyczą Twojego konta w CEL-TRONICS."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/koszyk")}
              disabled={refreshingCart}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {refreshingCart
                ? "Aktualizacja danych…"
                : hasStockConflict
                  ? "Sprawdź dostępność"
                  : requiresPricing
                    ? "Przejdź do zapytania"
                    : "Przejdź do zamówienia"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </footer>
        </>
      )}
    </aside>
  )
}
