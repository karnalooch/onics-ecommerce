import { describe, expect, it } from "vitest"
import {
  calculateCustomerUnitPrice,
  clampDiscount,
  resolveCartItems,
} from "@/lib/commerce"

const product = {
  id: "p1",
  sku: "SKU-1",
  name: "Produkt",
  price: 100,
  stock: 5,
}

describe("commerce pricing", () => {
  it("clamps invalid discounts", () => {
    expect(clampDiscount(-10)).toBe(0)
    expect(clampDiscount(125)).toBe(100)
    expect(clampDiscount("abc")).toBe(0)
  })

  it("applies explicit B2B discount only to BIZ users", () => {
    expect(calculateCustomerUnitPrice(product, { role: "BIZ", discount: 15 })).toBe(85)
    expect(calculateCustomerUnitPrice(product, { role: "ADMIN", discount: 15 })).toBe(100)
  })

  it("resolves prices from the server catalog and ignores client prices", () => {
    const result = resolveCartItems(
      [{ id: "p1", quantity: 2 }],
      [product],
      { role: "BIZ", discount: 10 },
      { requirePriced: true, requireStock: true }
    )

    expect(result.items[0].price).toBe(90)
    expect(result.total).toBe(180)
  })

  it("rejects missing stock and unknown products", () => {
    expect(() =>
      resolveCartItems(
        [{ id: "p1", quantity: 6 }],
        [product],
        { role: "BIZ" },
        { requireStock: true }
      )
    ).toThrow(/Brak wymaganej ilości/)

    expect(() =>
      resolveCartItems([{ id: "missing", quantity: 1 }], [product])
    ).toThrow(/nie istnieje/)
  })
})
