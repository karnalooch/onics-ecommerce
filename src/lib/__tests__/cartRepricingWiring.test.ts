import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("authoritative cart repricing wiring", () => {
  it("protects the cart preview with the transaction-role boundary", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/cart/preview/route.ts"),
      "utf8"
    )

    expect(route).toContain("authorizeAPI([...COMMERCE_TRANSACTION_ROLES])")
    expect(route).toContain("buildAuthoritativeCartSnapshot")
    expect(route).toContain('"Cache-Control": "no-store"')
  })

  it("refreshes both storefront mini-cart and full cart through one hook", () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/lib/useAuthoritativeCart.ts"),
      "utf8"
    )
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const miniCart = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/MiniCart.tsx"),
      "utf8"
    )
    const shopPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/page.tsx"),
      "utf8"
    )

    expect(hook).toContain('fetch("/api/cart/preview"')
    expect(hook).toContain("replaceItems(nextItems)")
    expect(cartPage).toContain("useAuthoritativeCart")
    expect(miniCart).toContain("useAuthoritativeCart")
    expect(shopPage).toContain("cartOwnerKey={cartOwnerKey}")
  })

  it("surfaces current stock without replacing final server validation", () => {
    const snapshot = fs.readFileSync(
      path.join(process.cwd(), "src/lib/cartSnapshot.ts"),
      "utf8"
    )
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/lib/useAuthoritativeCart.ts"),
      "utf8"
    )
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const miniCart = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/MiniCart.tsx"),
      "utf8"
    )

    expect(snapshot).toContain("availableStock")
    expect(hook).toContain("availableStockById")
    expect(cartPage).toContain("const hasStockConflict = stockConflictItems.length > 0")
    expect(cartPage).toContain('action === "ORDER" && hasStockConflict')
    expect(cartPage).toContain("Zmniejsz ilość przed uruchomieniem płatności")
    expect(miniCart).toContain("Popraw dostępność")
  })

  it("refreshes authoritative cart data after transaction conflicts", () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/lib/useAuthoritativeCart.ts"),
      "utf8"
    )
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const checkoutRoute = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/checkout/route.ts"),
      "utf8"
    )

    expect(hook).toContain("const refreshCart = useCallback")
    expect(hook).toContain("setRefreshVersion((version) => version + 1)")
    expect(hook).toContain("availableStockById, refreshCart")
    expect(
      cartPage.match(/if \(response\.status === 409\) refreshCart\(\);/g)
    ).toHaveLength(2)
    expect(checkoutRoute).toContain(
      'const checkoutConflict = code === "CHECKOUT_STATE_CHANGED" || inventoryConflict'
    )
    expect(checkoutRoute).toContain("checkoutConflict")
    expect(checkoutRoute).toContain("? 409")
  })

  it("fails closed hard transactions until the current preview is verified", () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), "src/lib/useAuthoritativeCart.ts"),
      "utf8"
    )
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(hook).toContain("verifiedPreviewKey")
    expect(hook).toContain("setVerifiedPreviewKey(\"\")")
    expect(hook).toContain("cartPreviewVerified")
    expect(hook).toContain("cartPreviewFailed")
    expect(cartPage).toContain('action === "ORDER" && !cartPreviewVerified')
    expect(cartPage).toContain("!cartPreviewVerified")
    expect(cartPage).toContain("Spróbuj odświeżyć ponownie")
  })

  it("keeps transaction actions paused while repricing is running", () => {
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const miniCart = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/MiniCart.tsx"),
      "utf8"
    )

    expect(cartPage).toContain("if (refreshingCart)")
    expect(cartPage).toContain(
      "submitting !== null || requiresPricing || refreshingCart"
    )
    expect(miniCart).toContain("disabled={refreshingCart}")
  })
})
