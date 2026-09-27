import { describe, expect, it } from "vitest"
import {
  buildWfMagCatalogProduct,
  catalogCategoryRevision,
  catalogProductRevision,
  ensureManufacturerRecord,
  findCatalogCategoryByName,
  findRemovedReferencedSubcategoryIds,
  hasCatalogCategoryNameConflict,
  hasCatalogSubcategoryNameConflict,
  hasCategoryProductReference,
  hasSubcategoryProductReference,
  hasManufacturerProductReference,
  hasSkuConflict,
  indexCatalogCategoriesByName,
  indexCatalogManufacturersByName,
  indexCatalogProductsBySku,
  indexCatalogSubcategoriesByName,
  isCatalogCategoryCreateReplay,
  isCatalogProductStateEqual,
  isCatalogProductUpdateReplay,
  nextCatalogCategoryRevision,
  nextCatalogProductRevision,
  validateCatalogClassification,
} from "@/lib/catalog"

describe("WF-Mag live product boundary", () => {
  it("persists only live catalog fields and drops staging metadata", () => {
    const product = buildWfMagCatalogProduct(
      {
        sku: "  SKU-1  ",
        name: " Centrala ",
        price: 123.45,
        stock: 7,
        manufacturer: " SATEL ",
        specs: "Specyfikacja",
        tempId: "stg-1",
        qualityLevel: "LOW",
        qualityReason: "Nowy produkt",
        knowledgeMatched: false,
        isValid: true,
        isNewCategory: true,
        xlsCategoryName: "Alarmy",
      },
      {
        id: "p1",
        categoryId: "c1",
        subcategoryId: "s1",
      }
    )

    expect(product).toEqual({
      id: "p1",
      sku: "SKU-1",
      name: "Centrala",
      price: 123.45,
      stock: 7,
      manufacturer: "SATEL",
      categoryId: "c1",
      subcategoryId: "s1",
      specs: "Specyfikacja",
      seoDescription: "",
      revision: 0,
    })
    expect(product).not.toHaveProperty("tempId")
    expect(product).not.toHaveProperty("qualityLevel")
    expect(product).not.toHaveProperty("knowledgeMatched")
    expect(product).not.toHaveProperty("isNewCategory")
    expect(product).not.toHaveProperty("xlsCategoryName")
  })
})

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


  it("fails closed when persisted manufacturers duplicate a normalized name", () => {
    expect(() =>
      indexCatalogManufacturersByName([
        { id: "m1", name: "Hikvision" },
        { id: "m2", name: "  HIKVISION  " },
      ])
    ).toThrow("CATALOG_DUPLICATE_MANUFACTURER_NAME")
  })

  it("keeps a shared manufacturer identity index in sync during import-style creation", () => {
    const manufacturers = [{ id: "m1", name: "SATEL" }]
    const manufacturerByName = indexCatalogManufacturersByName(manufacturers)

    const created = ensureManufacturerRecord(
      manufacturers,
      "Hikvision",
      "m2",
      manufacturerByName
    )
    const replayed = ensureManufacturerRecord(
      manufacturers,
      " hikvision ",
      "m3",
      manufacturerByName
    )

    expect(replayed).toBe(created)
    expect(manufacturerByName.get("hikvision")).toBe(created)
    expect(manufacturers).toHaveLength(2)
  })
})


describe("catalog manufacturer references", () => {
  const products = [
    { id: "p1", manufacturer: "SATEL" },
    { id: "p2", manufacturer: "Hikvision" },
    { id: "p3", manufacturer: null },
  ]

  it("detects manufacturer references case-insensitively", () => {
    expect(hasManufacturerProductReference(products, " satel ")).toBe(true)
    expect(hasManufacturerProductReference(products, "HIKVISION")).toBe(true)
    expect(hasManufacturerProductReference(products, "Dahua")).toBe(false)
    expect(hasManufacturerProductReference(products, "")).toBe(false)
  })
})

describe("catalog product revisions", () => {
  it("normalizes legacy or invalid revisions to zero", () => {
    expect(catalogProductRevision(undefined)).toBe(0)
    expect(catalogProductRevision(null)).toBe(0)
    expect(catalogProductRevision(-1)).toBe(0)
    expect(catalogProductRevision(1.5)).toBe(0)
    expect(catalogProductRevision(4)).toBe(4)
  })

  it("increments from the normalized current revision", () => {
    expect(nextCatalogProductRevision(undefined)).toBe(1)
    expect(nextCatalogProductRevision(7)).toBe(8)
  })

  it("recognizes exact product retries but rejects divergent stale state", () => {
    const current = {
      id: "p1",
      sku: "SKU-1",
      name: "Centrala",
      price: 120,
      stock: 4,
      manufacturer: "SATEL",
      categoryId: "c1",
      subcategoryId: "s1",
      seoDescription: "Opis",
      description: "Opis formularza",
      revision: 3,
    }

    expect(
      isCatalogProductUpdateReplay(current, {
        id: "p1",
        sku: " sku-1 ",
        name: "Centrala",
        price: 120,
        stock: 4,
        manufacturer: "SATEL",
        categoryId: "c1",
        subcategoryId: "s1",
        seoDescription: "Opis",
        description: "Opis formularza",
      })
    ).toBe(true)

    expect(
      isCatalogProductStateEqual(current, {
        ...current,
        stock: 5,
      })
    ).toBe(false)
  })
})

describe("catalog category revisions", () => {
  it("normalizes legacy or invalid revisions to zero", () => {
    expect(catalogCategoryRevision(undefined)).toBe(0)
    expect(catalogCategoryRevision(null)).toBe(0)
    expect(catalogCategoryRevision(-1)).toBe(0)
    expect(catalogCategoryRevision(1.5)).toBe(0)
    expect(catalogCategoryRevision(4)).toBe(4)
  })

  it("increments from the normalized current revision", () => {
    expect(nextCatalogCategoryRevision(undefined)).toBe(1)
    expect(nextCatalogCategoryRevision(7)).toBe(8)
  })
})

describe("catalog category identity", () => {
  const categories = [
    { id: "c1", name: "ALARMY" },
    { id: "c2", name: "Monitoring" },
  ]

  it("finds category identity case-insensitively", () => {
    expect(findCatalogCategoryByName(categories, " alarmy ")).toBe(
      categories[0]
    )
  })

  it("detects rename conflicts while allowing the current category", () => {
    expect(
      hasCatalogCategoryNameConflict(categories, "monitoring", "c1")
    ).toBe(true)
    expect(
      hasCatalogCategoryNameConflict(categories, "alarmy", "c1")
    ).toBe(false)
  })

  it("accepts only semantically identical category creation as replay", () => {
    const existing = {
      id: "c1",
      name: "ALARMY",
      iconName: "Folder",
      subcategories: [{ id: "s1", name: "Centrale" }],
    }

    expect(
      isCatalogCategoryCreateReplay(existing, {
        name: " alarmy ",
        iconName: "Folder",
        subcategories: [{ name: " centrale " }],
      })
    ).toBe(true)

    expect(
      isCatalogCategoryCreateReplay(existing, {
        name: "ALARMY",
        iconName: "Layers",
        subcategories: [{ name: "Centrale" }],
      })
    ).toBe(false)

    expect(
      isCatalogCategoryCreateReplay(existing, {
        name: "ALARMY",
        iconName: "Folder",
        subcategories: [{ name: "Centrale" }, { name: "Sygnalizatory" }],
      })
    ).toBe(false)
  })

  it("fails closed when persisted categories already duplicate a name", () => {
    expect(() =>
      indexCatalogCategoriesByName([
        { id: "c1", name: "ALARMY" },
        { id: "c2", name: " alarmy " },
      ])
    ).toThrow("CATALOG_DUPLICATE_CATEGORY_NAME")
  })
})

describe("catalog subcategory identity", () => {
  const subcategories = [
    { id: "s1", name: "Centrale" },
    { id: "s2", name: "Sygnalizatory" },
  ]

  it("detects same-category name collisions case-insensitively", () => {
    expect(
      hasCatalogSubcategoryNameConflict(subcategories, " centrale ", "s2")
    ).toBe(true)
    expect(
      hasCatalogSubcategoryNameConflict(subcategories, "centrale", "s1")
    ).toBe(false)
  })

  it("fails closed on persisted duplicate subcategory names", () => {
    expect(() =>
      indexCatalogSubcategoriesByName([
        { id: "s1", name: "Centrale" },
        { id: "s2", name: " centrale " },
      ])
    ).toThrow("CATALOG_DUPLICATE_SUBCATEGORY_NAME")
  })

  it("detects exact category/subcategory product references", () => {
    const products = [
      { id: "p1", categoryId: "c1", subcategoryId: "s1" },
      { id: "p2", categoryId: "c2", subcategoryId: "s1" },
    ]

    expect(hasSubcategoryProductReference(products, "c1", "s1")).toBe(true)
    expect(hasSubcategoryProductReference(products, "c1", "missing")).toBe(false)
    expect(hasSubcategoryProductReference(products, "c2", "s1")).toBe(true)
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

