import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("cart quantity boundary wiring", () => {
  it("keeps client mutations inside the shared cart quantity contract", () => {
    const store = fs.readFileSync(
      path.join(process.cwd(), "src/store/cartStore.ts"),
      "utf8"
    )
    const productCard = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/ProductCard.tsx"),
      "utf8"
    )
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(store).toContain("addItem: (item: CartItem) => boolean")
    expect(store).toContain("resolveMergedCartQuantity(")
    expect(store).toContain("isValidCartItemQuantity(item.quantity)")
    expect(productCard).toContain("if (!added)")
    expect(productCard).toContain("CART_ITEM_QUANTITY_MAX")
    expect(cartPage).toContain("Pominięto ${skippedCount} pozycji")
    expect(cartPage).toContain("item.quantity >= CART_ITEM_QUANTITY_MAX")
  })

  it("reuses one quantity maximum across server transaction boundaries", () => {
    for (const relativePath of [
      "src/lib/commerce.ts",
      "src/lib/orderImport.ts",
      "src/app/api/cart/preview/route.ts",
      "src/app/api/cart/offer-preview/route.ts",
      "src/app/api/orders/route.ts",
      "src/app/api/checkout/route.ts",
    ]) {
      const source = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        "utf8"
      )

      expect(source).toContain("CART_ITEM_QUANTITY_MAX")
    }
  })
})
