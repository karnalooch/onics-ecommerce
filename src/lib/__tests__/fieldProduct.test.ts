import { describe, expect, it } from "vitest"
import {
  extractTechnicalFacts,
  extractVerifiedProcedure,
  scoreFieldProduct,
} from "@/lib/fieldProduct"

describe("field product projection", () => {
  it("extracts only technical facts present in source text", () => {
    expect(
      extractTechnicalFacts(
        "Kamera IP 8 MP, obiektyw 2.8 mm, PoE 802.3af, IP67, IR zasięg 40 m, EAN 5901234567890"
      )
    ).toEqual(
      expect.arrayContaining([
        { label: "Rozdzielczość", value: "8 MP" },
        { label: "PoE", value: "802.3af" },
        { label: "Odporność", value: "IP67" },
        { label: "Optyka / wymiar", value: "2.8 mm" },
        { label: "Zasięg", value: "40 m" },
        { label: "EAN / kod", value: "5901234567890" },
      ])
    )
  })

  it("does not invent a procedure from narrative prose", () => {
    expect(
      extractVerifiedProcedure(
        "Kamera przeznaczona do instalacji zewnętrznych. Obsługuje PoE i IP67."
      )
    ).toEqual([])
  })

  it("accepts explicit ordered procedure steps only", () => {
    expect(
      extractVerifiedProcedure(
        "1. Podłącz przewód sieciowy\n2) Włącz zasilanie\nKrok 3: Zweryfikuj adres IP"
      )
    ).toEqual([
      "Podłącz przewód sieciowy",
      "Włącz zasilanie",
      "Zweryfikuj adres IP",
    ])
  })

  it("requires every search token and prioritizes exact SKU", () => {
    const product = {
      sku: "BCS-CAM-8MP",
      name: "Kamera IP",
      manufacturer: "BCS",
      description: "8 MP PoE IP67",
    }

    expect(scoreFieldProduct(product, "BCS-CAM-8MP")).toBe(1000)
    expect(scoreFieldProduct(product, "8 mp poe")).toBeGreaterThan(0)
    expect(scoreFieldProduct(product, "8 mp wifi")).toBe(-1)
  })
})
