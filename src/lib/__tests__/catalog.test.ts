import { describe, expect, it } from "vitest"
import {
  ensureManufacturerRecord,
  hasSkuConflict,
} from "@/lib/catalog"

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


describe("catalog manufacturer registry", () => {
  it("creates a missing manufacturer exactly once", () => {
    const manufacturers = [{ id: "m1", name: "SATEL" }]

    const created = ensureManufacturerRecord(
      manufacturers,
      "Hikvision",
      "m2"
    )
    const existing = ensureManufacturerRecord(
      manufacturers,
      " hikvision ",
      "m3"
    )

    expect(created).toEqual({ id: "m2", name: "Hikvision" })
    expect(existing).toBe(created)
    expect(manufacturers).toHaveLength(2)
  })

  it("ignores blank manufacturer names", () => {
    const manufacturers: Array<{ id: string; name: string }> = []

    expect(
      ensureManufacturerRecord(manufacturers, "   ", "m1")
    ).toBeNull()
    expect(manufacturers).toEqual([])
  })
})
