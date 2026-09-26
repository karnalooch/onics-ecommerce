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
