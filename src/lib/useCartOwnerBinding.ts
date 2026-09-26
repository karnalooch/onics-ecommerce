"use client"

import { useEffect, useState } from "react"
import { useCartStore } from "@/store/cartStore"

function markerFor(ownerKey: string | null) {
  return ownerKey ?? "__anonymous__"
}

export function useCartOwnerBinding(options: {
  identityKey: string | null
  resolved: boolean
}) {
  const ownerKey = useCartStore((state) => state.ownerKey)
  const bindOwner = useCartStore((state) => state.bindOwner)
  const [hydrated, setHydrated] = useState(() =>
    useCartStore.persist.hasHydrated()
  )
  const [boundMarker, setBoundMarker] = useState<string | null>(null)

  useEffect(() => {
    const markHydrated = () => setHydrated(true)

    if (useCartStore.persist.hasHydrated()) {
      markHydrated()
    }

    return useCartStore.persist.onFinishHydration(markHydrated)
  }, [])

  const expectedMarker = markerFor(options.identityKey)

  useEffect(() => {
    if (!hydrated || !options.resolved) {
      setBoundMarker(null)
      return
    }

    bindOwner(options.identityKey)
    setBoundMarker(expectedMarker)
  }, [
    bindOwner,
    expectedMarker,
    hydrated,
    options.identityKey,
    options.resolved,
  ])

  return {
    cartOwnerReady:
      hydrated &&
      options.resolved &&
      boundMarker === expectedMarker &&
      ownerKey === options.identityKey,
  }
}
