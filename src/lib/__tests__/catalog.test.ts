import { describe, expect, it } from "vitest"
import {
  ensureManufacturerRecord,
  findRemovedReferencedSubcategoryIds,
  hasCategoryProductReference,
  hasSkuConflict,
  indexCatalogProductsBySku,
  validateCatalogClassification,
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

  it("indexes import identity only by SKU even when product names collide", () => {
    const collidingNames = [
      { id: "p1", sku: "OLD-001", name: "Centrala alarmowa" },
      { id: "p2", sku: "OLD-002", name: "Centrala alarmowa" },
    ]

    const index = indexCatalogProductsBySku(collidingNames)

    expect(index.get("old-001")).toBe(collidingNames[0])
    expect(index.get("old-002")).toBe(collidingNames[1])
    expect(index.get("new-003")).toBeUndefined()
  })

  it("fails closed when the persisted catalog already contains duplicate SKUs", () => {
    expect(() =>
      indexCatalogProductsBySku([
        { id: "p1", sku: "ABC-123" },
        { id: "p2", sku: " abc-123 " },
      ])
    ).toThrow("CATALOG_DUPLICATE_SKU")
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

describe("catalog category references", () => {
  const products = [
    { id: "p1", categoryId: "c1", subcategoryId: "s1" },
    { id: "p2", categoryId: "c1", subcategoryId: "s2" },
    { id: "p3", categoryId: "c2", subcategoryId: "s1" },
    { id: "p4", categoryId: null, subcategoryId: null },
  ]

  it("detects categories that are still referenced by products", () => {
    expect(hasCategoryProductReference(products, "c1")).toBe(true)
    expect(hasCategoryProductReference(products, "c3")).toBe(false)
    expect(hasCategoryProductReference(products, "")).toBe(false)
  })

  it("reports only removed subcategories that are still referenced", () => {
    expect(
      findRemovedReferencedSubcategoryIds(products, "c1", ["s1"])
    ).toEqual(["s2"])

    expect(
      findRemovedReferencedSubcategoryIds(products, "c1", ["s1", "s2"])
    ).toEqual([])

    expect(
      findRemovedReferencedSubcategoryIds(products, "c2", ["s1"])
    ).toEqual([])
  })
})

describe("catalog product classification", () => {
  const categories = [
    {
      id: "c1",
      subcategories: [{ id: "s1" }, { id: "s2" }],
    },
    {
      id: "c2",
      subcategories: [{ id: "s3" }],
    },
  ]

  it("accepts empty or valid category assignments", () => {
    expect(validateCatalogClassification(categories, null, null)).toBeNull()
    expect(validateCatalogClassification(categories, "c1", null)).toBeNull()
    expect(validateCatalogClassification(categories, "c1", "s2")).toBeNull()
  })

  it("rejects dangling or cross-category assignments", () => {
    expect(
      validateCatalogClassification(categories, null, "s1")
    ).toBe("SUBCATEGORY_WITHOUT_CATEGORY")
    expect(
      validateCatalogClassification(categories, "missing", null)
    ).toBe("CATEGORY_NOT_FOUND")
    expect(
      validateCatalogClassification(categories, "c1", "s3")
    ).toBe("SUBCATEGORY_NOT_FOUND")
  })
})

