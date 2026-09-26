"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useCartStore } from "@/store/cartStore"

export type CartStockByProduct = Record<string, number>

export function useAuthoritativeCart(options: {
  enabled: boolean
  identityKey: string
}) {
  const items = useCartStore((state) => state.items)
  const replaceItems = useCartStore((state) => state.replaceItems)
  const lastPreviewKeyRef = useRef("")
  const [refreshingCart, setRefreshingCart] = useState(false)
  const [availableStockById, setAvailableStockById] =
    useState<CartStockByProduct>({})

  const previewKey = [
    options.identityKey || "anonymous",
    ...items.map((item) => `${item.id}:${item.quantity}`),
  ].join("|")

  useEffect(() => {
    if (!options.enabled || items.length === 0) {
      lastPreviewKeyRef.current = ""
      setRefreshingCart(false)
      setAvailableStockById({})
      return
    }
    if (lastPreviewKeyRef.current === previewKey) return

    lastPreviewKeyRef.current = previewKey
    let cancelled = false
    setRefreshingCart(true)

    fetch("/api/cart/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            data?.error || "Nie udało się odświeżyć bieżących danych koszyka."
          )
        }
        if (!Array.isArray(data?.items)) {
          throw new Error("Serwer zwrócił nieprawidłowy podgląd koszyka.")
        }

        const previewItems = data.items.map((item: any) => {
          const availableStock = Number(item.availableStock)
          if (!Number.isInteger(availableStock) || availableStock < 0) {
            throw new Error("Serwer zwrócił nieprawidłowy stan magazynowy.")
          }

          return {
            cartItem: {
              id: String(item.id),
              sku: String(item.sku),
              name: String(item.name),
              price: Number(item.price),
              quantity: Number(item.quantity),
            },
            availableStock,
          }
        })

        if (cancelled) return

        const nextItems = previewItems.map((item) => item.cartItem)
        setAvailableStockById(
          Object.fromEntries(
            previewItems.map((item) => [
              item.cartItem.id,
              item.availableStock,
            ])
          )
        )

        const changed =
          nextItems.length !== items.length ||
          nextItems.some((item, index) => {
            const current = items[index]
            return (
              !current ||
              current.id !== item.id ||
              current.sku !== item.sku ||
              current.name !== item.name ||
              current.price !== item.price ||
              current.quantity !== item.quantity
            )
          })

        if (changed) {
          replaceItems(nextItems)
          toast.info("Koszyk zaktualizowano do bieżących danych katalogu.")
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAvailableStockById({})
          toast.warning(
            error instanceof Error
              ? error.message
              : "Nie udało się odświeżyć bieżących danych koszyka."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setRefreshingCart(false)
      })

    return () => {
      cancelled = true
    }
  }, [items, options.enabled, previewKey, replaceItems])

  return { refreshingCart, availableStockById }
}
