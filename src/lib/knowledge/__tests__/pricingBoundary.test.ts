import { describe, expect, it } from "vitest"
import {
  preserveSalePriceForKnowledgeUpdate,
  pricingForKnowledgeCreatedProduct,
} from "../pricingBoundary"

describe("knowledge catalog pricing boundary", () => {
  it("never replaces an active sale price with an extracted catalog price", () => {
    expect(
      preserveSalePriceForKnowledgeUpdate(
        { price: 1299, catalogPrice: 1199 },
        899
      )
    ).toEqual({
      price: 1299,
      catalogPrice: 899,
    })
  })

  it("preserves the previous catalog reference when extraction has no price", () => {
    expect(
      preserveSalePriceForKnowledgeUpdate(
        { price: 1299, catalogPrice: 1199 },
        null
      )
    ).toEqual({
      price: 1299,
      catalogPrice: 1199,
    })
  })

  it("keeps a product unsellable when it had no explicit sale price", () => {
    expect(
      preserveSalePriceForKnowledgeUpdate(
        { price: 0, catalogPrice: null },
        899
      )
    ).toEqual({
      price: 0,
      catalogPrice: 899,
    })
  })

  it("creates knowledge-discovered products with sale price disabled", () => {
    expect(pricingForKnowledgeCreatedProduct(899)).toEqual({
      price: 0,
      catalogPrice: 899,
    })
  })

  it("fails closed for invalid extracted catalog prices", () => {
    expect(() => pricingForKnowledgeCreatedProduct(-1)).toThrow(
      "KNOWLEDGE_CATALOG_PRICE_INVALID"
    )
    expect(() => pricingForKnowledgeCreatedProduct(Number.POSITIVE_INFINITY)).toThrow(
      "KNOWLEDGE_CATALOG_PRICE_INVALID"
    )
  })
})
