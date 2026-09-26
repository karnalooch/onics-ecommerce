import { describe, expect, it } from "vitest"
import { hasSkuConflict } from "@/lib/catalog"

describe("catalog SKU uniqueness", () => {
  const products = [
    { id: "p1", sku: "ABC-123" },
    { id: "p2", sku: "XYZ-999" },
  ]

  it("detects duplicate SKUs case-insensitively", () => {
    expect(hasSkuConflict(products, " abc-123 ")).toBe(true)
  })

  it("allows an existing product to keep its own SKU", () => {
    expect(hasSkuConflict(products, "ABC-123", "p1")).toBe(false)
  })

  it("detects conflicts when editing to another product's SKU", () => {
    expect(hasSkuConflict(products, "xyz-999", "p1")).toBe(true)
  })
})
