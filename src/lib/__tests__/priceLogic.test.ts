import { describe, expect, it } from "vitest"
import {
  applyMarkup,
  calculateB2BPrice,
  normalizePricingCategory,
} from "@/app/admin/price-lists/_lib/priceLogic"

describe("price list logic", () => {
  it("maps dynamic category names to pricing groups", () => {
    expect(normalizePricingCategory("SSWIN")).toBe("sswin")
    expect(normalizePricingCategory("Kontrola Dostępu")).toBe("kd")
    expect(normalizePricingCategory("Systemy SSP / PPOŻ")).toBe("fire")
  })

  it("applies category and case-insensitive manufacturer rules", () => {
    expect(
      calculateB2BPrice(
        { price: 100, manufacturer: "satel" },
        "PARTNER",
        "SSWIN"
      )
    ).toEqual({ price: 75, discount: 25 })

    expect(
      calculateB2BPrice({ price: 100 }, "PARTNER", "CCTV")
    ).toEqual({ price: 85, discount: 15 })
  })

  it("prevents invalid negative outputs from markup", () => {
    expect(applyMarkup(100, -200)).toBe(0)
    expect(applyMarkup(100, 20)).toBe(120)
  })
})
