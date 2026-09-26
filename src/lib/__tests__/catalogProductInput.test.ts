import { describe, expect, it } from "vitest"
import {
  CatalogProductInputSchema,
  CatalogProductUpdateSchema,
} from "@/lib/catalogProductInput"

describe("manual catalog product write boundary", () => {
  it("keeps create IDs server-authoritative and drops unknown control metadata", () => {
    const parsed = CatalogProductInputSchema.parse({
      id: "client-supplied-id",
      sku: "  SKU-100  ",
      name: "  Czujka ruchu  ",
      price: "199.99",
      stock: "12",
      manufacturer: " SATEL ",
      categoryId: "c1",
      subcategoryId: "s1",
      seoDescription: "Opis",
      tempId: "staging-1",
      qualityLevel: "LOW",
      qualityReason: "manual review",
      knowledgeMatched: false,
      isVirtual: true,
      isIqSynced: true,
      catalogPrice: 999,
      internalNote: "do not persist",
    })

    expect(parsed).toEqual({
      sku: "SKU-100",
      name: "Czujka ruchu",
      price: 199.99,
      stock: 12,
      manufacturer: "SATEL",
      categoryId: "c1",
      subcategoryId: "s1",
      seoDescription: "Opis",
    })
  })

  it("keeps the required update ID while dropping unknown fields", () => {
    const parsed = CatalogProductUpdateSchema.parse({
      id: "p1",
      sku: "SKU-100",
      name: "Czujka ruchu",
      price: 199.99,
      stock: 12,
      isVirtual: true,
      tempId: "staging-1",
    })

    expect(parsed).toEqual({
      id: "p1",
      sku: "SKU-100",
      name: "Czujka ruchu",
      price: 199.99,
      stock: 12,
    })
    expect(parsed).not.toHaveProperty("isVirtual")
    expect(parsed).not.toHaveProperty("tempId")
  })
})
