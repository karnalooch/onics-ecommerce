"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useCartStore } from "@/store/cartStore"
import { validateAuthoritativeCartPreview } from "@/lib/cartPreviewContract"

export type CartStockByProduct = Partial<Record<string, number>>

export function useAuthoritativeCart(options: {
  enabled: boolean
  identityKey: string
}) {
  const items = useCartStore((state) => state.items)
  const replaceItems = useCartStore((state) => state.replaceItems)
  const lastPreviewKeyRef = useRef("")
  const [refreshingCart, setRefreshingCart] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [verifiedPreviewKey, setVerifiedPreviewKey] = useState("")
  const [cartPreviewFailed, setCartPreviewFailed] = useState(false)
  const [availableStockById, setAvailableStockById] =
    useState<CartStockByProduct>({})

  const refreshCart = useCallback(() => {
    lastPreviewKeyRef.current = ""
    setVerifiedPreviewKey("")
    setCartPreviewFailed(false)
    setRefreshVersion((version) => version + 1)
  }, [])

  const previewKey = [
    options.identityKey || "anonymous",
    ...items.map((item) => `${item.id}:${item.quantity}`),
  ].join("|")

  useEffect(() => {
    if (!options.enabled || items.length === 0) {
      lastPreviewKeyRef.current = ""
      setVerifiedPreviewKey("")
      setCartPreviewFailed(false)
      setRefreshingCart(false)
      setAvailableStockById({})
      return
    }
    if (lastPreviewKeyRef.current === previewKey) return

    lastPreviewKeyRef.current = previewKey
    let cancelled = false
    setCartPreviewFailed(false)
    setRefreshingCart(true)

    const requestedItems = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    }))

    fetch("/api/cart/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ items: requestedItems }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            data?.error || "Nie udało się odświeżyć bieżących danych koszyka."
          )
        }
        const previewItems = validateAuthoritativeCartPreview(
          requestedItems,
          data?.items
        )

        if (cancelled) return

        setVerifiedPreviewKey(previewKey)
        setCartPreviewFailed(false)

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
          setVerifiedPreviewKey("")
          setCartPreviewFailed(true)
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
  }, [items, options.enabled, previewKey, refreshVersion, replaceItems])

  const cartPreviewVerified =
    options.enabled &&
    items.length > 0 &&
    verifiedPreviewKey === previewKey

  return {
    refreshingCart,
    availableStockById,
    refreshCart,
    cartPreviewVerified,
    cartPreviewFailed,
  }
}
