import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("persisted cart account isolation wiring", () => {
  it("persists an owner key and clears on owner changes", () => {
    const store = fs.readFileSync(
      path.join(process.cwd(), "src/store/cartStore.ts"),
      "utf8"
    )

    expect(store).toContain("ownerKey: string | null")
    expect(store).toContain("bindOwner: (ownerKey: string | null) => void")
    expect(store).toContain("shouldResetCartForOwner(")
    expect(store).toContain("set({ ownerKey: nextOwnerKey, items: [] })")
    expect(store).toContain("sanitizePersistedCartState")
    expect(store).toContain("merge: (persistedState, currentState)")
    expect(store).toContain("sanitizeCartItems(items)")
  })

  it("waits for Zustand persistence hydration before binding an account", () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/lib/useCartOwnerBinding.ts"),
      "utf8"
    )

    expect(hook).toContain("const persistApi = useCartStore.persist")
    expect(hook).toContain("if (!persistApi) return")
    expect(hook).toContain("persistApi.hasHydrated()")
    expect(hook).toContain("persistApi.onFinishHydration")
    expect(hook).toContain("bindOwner(options.identityKey)")
  })

  it("gates every cart surface and catalog mutation on the bound owner", () => {
    const shop = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/ShopDashboardClient.tsx"),
      "utf8"
    )
    const cart = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const offer = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/oferta/page.tsx"),
      "utf8"
    )
    const catalog = fs.readFileSync(
      path.join(process.cwd(), "src/app/produkty/page.tsx"),
      "utf8"
    )
    const addButton = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/AddToCartButton.tsx"),
      "utf8"
    )
    const b2bOfferPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/(b2b)/oferty/page.tsx"),
      "utf8"
    )
    const b2bOfferGrid = fs.readFileSync(
      path.join(process.cwd(), "src/components/ui/B2BDashboardGrid.tsx"),
      "utf8"
    )

    expect(shop).toContain("useCartOwnerBinding")
    expect(shop).toContain("if (!cartOwnerReady)")
    expect(cart).toContain("useCartOwnerBinding")
    expect(cart).toContain("if (!mounted || !cartOwnerReady)")
    expect(cart).toContain('resolved: sessionStatus !== "loading"')
    expect(offer).toContain("useCartOwnerBinding")
    expect(offer).toContain("if (!mounted || !cartOwnerReady) return")
    expect(offer).toContain("if (!mounted || !cartOwnerReady || loading)")
    expect(offer).toContain('resolved: sessionStatus !== "loading"')
    expect(catalog).toContain("buildCartOwnerKey(sessionUser)")
    expect(catalog).toContain("ownerKey={cartOwnerKey}")
    expect(addButton).toContain("useCartOwnerBinding")
    expect(addButton).toContain("if (!cartOwnerReady || !ownerKey) return")
    expect(addButton).toContain("disabled={!cartOwnerReady || !ownerKey}")
    expect(b2bOfferPage).toContain("buildCartOwnerKey(sessionUser)")
    expect(b2bOfferPage).toContain("ownerKey={cartOwnerKey}")
    expect(b2bOfferGrid).toContain("useCartOwnerBinding")
    expect(b2bOfferGrid).toContain("if (!cartOwnerReady) return")
    expect(b2bOfferGrid).toContain("!available || !cartOwnerReady")
  })
})
