import { describe, expect, it } from "vitest"
import {
  applyMarkup,
  calculateB2BPrice,
} from "@/app/admin/price-lists/_lib/priceLogic"
import { calculateCustomerUnitPrice } from "@/lib/commerce"

describe("price list logic", () => {
  it("uses explicit preset discounts instead of category or manufacturer overrides", () => {
    expect(
      calculateB2BPrice(
        { price: 100 },
        "PARTNER"
      )
    ).toEqual({ price: 90, discount: 10 })

    expect(calculateB2BPrice({ price: 100 }, "VIP")).toEqual({
      price: 80,
      discount: 20,
    })

    expect(calculateB2BPrice({ price: 100 }, "BASIC")).toEqual({
      price: 95,
      discount: 5,
    })
  })

  it("uses the same explicit-discount formula as authoritative B2B commerce pricing", () => {
    const product = {
      id: "p1",
      sku: "SKU-1",
      name: "Produkt",
      price: 123.45,
      stock: 1,
    }
    const preset = calculateB2BPrice(product, "PARTNER")

    expect(preset.price).toBe(
      calculateCustomerUnitPrice(product, {
        role: "BIZ",
        discount: preset.discount,
      })
    )
  })

  it("falls back to BASIC for an unknown document preset", () => {
    expect(calculateB2BPrice({ price: 100 }, "UNKNOWN")).toEqual({
      price: 95,
      discount: 5,
    })
  })

  it("fails closed on invalid base prices", () => {
    expect(calculateB2BPrice({ price: -1 }, "VIP")).toEqual({
      price: 0,
      discount: 0,
    })
  })

  it("prevents invalid negative outputs from markup", () => {
    expect(applyMarkup(100, -200)).toBe(0)
    expect(applyMarkup(100, 20)).toBe(120)
  })
})
