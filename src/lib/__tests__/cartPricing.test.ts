import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  cartRequiresPricing,
  hasActiveCartPrice,
} from "@/lib/cartPricing"

describe("cart pricing eligibility", () => {
  it("accepts only finite positive sale prices", () => {
    expect(hasActiveCartPrice(100)).toBe(true)
    expect(hasActiveCartPrice("12.50")).toBe(true)
    expect(hasActiveCartPrice(0)).toBe(false)
    expect(hasActiveCartPrice(-1)).toBe(false)
    expect(hasActiveCartPrice(Number.NaN)).toBe(false)
    expect(hasActiveCartPrice(undefined)).toBe(false)
  })

  it("marks mixed and fully unpriced carts as requiring pricing", () => {
    expect(cartRequiresPricing([{ price: 100 }, { price: 0 }])).toBe(true)
    expect(cartRequiresPricing([{ price: 0 }])).toBe(true)
    expect(cartRequiresPricing([{ price: 100 }, { price: 20 }])).toBe(false)
  })
})


describe("cart inquiry-only wiring", () => {
  it("keeps hard-order actions gated when the cart requires pricing", () => {
    const cartPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )
    const productCard = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/ProductCard.tsx"),
      "utf8"
    )

    expect(cartPage).toContain("const requiresPricing = cartRequiresPricing(items)")
    expect(cartPage).toContain('action !== "INQUIRY" && requiresPricing')
    expect(cartPage).toContain("submitting !== null || requiresPricing")
    expect(productCard).toContain("hasActiveCartPrice(product.price)")
    expect(productCard).toContain("Dodano do zapytania")
  })
})
