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

  it("gates storefront, full cart and offer preview on the bound owner", () => {
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

    expect(shop).toContain("useCartOwnerBinding")
    expect(shop).toContain("if (!cartOwnerReady)")
    expect(cart).toContain("useCartOwnerBinding")
    expect(cart).toContain("if (!mounted || !cartOwnerReady)")
    expect(cart).toContain('resolved: sessionStatus !== "loading"')
    expect(offer).toContain("useCartOwnerBinding")
    expect(offer).toContain("if (!mounted || !cartOwnerReady) return")
    expect(offer).toContain("if (!mounted || !cartOwnerReady || loading)")
    expect(offer).toContain('resolved: sessionStatus !== "loading"')
  })
})
