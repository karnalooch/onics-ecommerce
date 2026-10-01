import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  buildCatalogCategoryOptions,
  getProductCatalogDescription,
  matchesCatalogCategory,
  matchesProductCatalogQuery,
  projectProductCatalogClassification,
  projectProductCatalogForSession,
  projectProductCatalogKnowledge,
  type ProductCatalogCategory,
  type ProductCatalogRecord,
} from "@/lib/productCatalogView"

const product: ProductCatalogRecord = {
  id: "p1",
  sku: "SKU-1",
  name: "Produkt",
  price: 100,
  catalogPrice: 120,
  stock: 5,
}


const categories: ProductCatalogCategory[] = [
  {
    id: "cat_alarm",
    name: "Alarmy",
    subcategories: [{ id: "sub_motion", name: "Czujki" }],
  },
  {
    id: "cat_cctv",
    name: "CCTV",
    subcategories: [{ id: "sub_camera", name: "Kamery" }],
  },
]

describe("product catalog classification projection", () => {
  it("projects canonical category and subcategory names from stored ids", () => {
    const [projected] = projectProductCatalogClassification(
      [
        {
          ...product,
          categoryId: "cat_alarm",
          subcategoryId: "sub_motion",
          categoryName: "stale category",
          subcategoryName: "stale subcategory",
        },
      ],
      categories
    )

    expect(projected.categoryName).toBe("Alarmy")
    expect(projected.subcategoryName).toBe("Czujki")
  })

  it("does not resolve a subcategory outside the selected category", () => {
    const [projected] = projectProductCatalogClassification(
      [
        {
          ...product,
          categoryId: "cat_alarm",
          subcategoryId: "sub_camera",
        },
      ],
      categories
    )

    expect(projected.categoryName).toBe("Alarmy")
    expect(projected.subcategoryName).toBeNull()
  })

  it("builds filter options from canonical ids and accepts legacy name links", () => {
    const projected = projectProductCatalogClassification(
      [
        { ...product, id: "p1", categoryId: "cat_alarm" },
        { ...product, id: "p2", categoryId: "cat_alarm" },
        { ...product, id: "p3", categoryId: "cat_cctv" },
      ],
      categories
    )

    expect(buildCatalogCategoryOptions(projected)).toEqual([
      { id: "cat_alarm", name: "Alarmy" },
      { id: "cat_cctv", name: "CCTV" },
    ])
    expect(matchesCatalogCategory(projected[0], "cat_alarm")).toBe(true)
    expect(matchesCatalogCategory(projected[0], "Alarmy")).toBe(true)
    expect(matchesCatalogCategory(projected[0], "cat_cctv")).toBe(false)
  })
})

describe("product catalog Knowledge projection", () => {
  const knowledge = {
    "SKU-1": {
      manufacturer: "IQ Manufacturer",
      specs: "PoE, IP67",
      price: 140,
    },
    "VIRTUAL-2": {
      model: "Virtual Camera",
      manufacturer: "Virtual Manufacturer",
      category: "CCTV",
      subcategory: "Kamery",
      specs: "4K",
      price: 250,
    },
  }

  it("enriches stored SKUs case-insensitively without adding virtual products", () => {
    const projected = projectProductCatalogKnowledge(
      [
        {
          ...product,
          sku: "sku-1",
          manufacturer: "NIEZNANY",
          categoryId: "cat_alarm",
        },
      ],
      categories,
      knowledge,
      { includeVirtual: false }
    )

    expect(projected).toHaveLength(1)
    expect(projected[0].sku).toBe("sku-1")
    expect(projected[0].manufacturer).toBe("IQ Manufacturer")
    expect(projected[0].catalogSpecs).toBe("PoE, IP67")
    expect(projected[0].catalogPrice).toBe(140)
    expect(projected[0].isIqSynced).toBe(true)
    expect(projected[0].isVirtual).not.toBe(true)
    expect(projected[0].categoryName).toBe("Alarmy")
  })

  it("adds Knowledge-only devices only to the unified browsing projection", () => {
    const projected = projectProductCatalogKnowledge(
      [{ ...product, sku: "sku-1" }],
      categories,
      knowledge,
      { includeVirtual: true }
    )

    const virtual = projected.find((candidate) => candidate.sku === "VIRTUAL-2")

    expect(projected).toHaveLength(2)
    expect(virtual?.isVirtual).toBe(true)
    expect(virtual?.name).toBe("Virtual Camera")
    expect(virtual?.categoryId).toBe("cat_cctv")
    expect(virtual?.subcategoryId).toBe("sub_camera")
    expect(virtual?.categoryName).toBe("CCTV")
    expect(virtual?.subcategoryName).toBe("Kamery")
  })
})

describe("product catalog descriptive projection", () => {
  it("uses stored specs before knowledge and SEO fallbacks", () => {
    expect(
      getProductCatalogDescription({
        ...product,
        specs: "Stored technical specs",
        catalogSpecs: "Knowledge specs",
        seoDescription: "SEO description",
      })
    ).toBe("Stored technical specs")
  })

  it("renders Knowledge Hub specs for virtual products without stored specs", () => {
    expect(
      getProductCatalogDescription({
        ...product,
        id: "virtual_SKU-1",
        isVirtual: true,
        catalogSpecs: "12 V DC, IP67",
        seoDescription: "12 V DC, IP67",
      })
    ).toBe("12 V DC, IP67")
  })

  it("searches technical, SEO and classification metadata from the shared view", () => {
    const projected: ProductCatalogRecord = {
      ...product,
      catalogSpecs: "PoE 802.3af",
      seoDescription: "Kamera kopułkowa",
      categoryName: "CCTV",
      subcategoryName: "Kamery IP",
    }

    expect(matchesProductCatalogQuery(projected, "802.3af")).toBe(true)
    expect(matchesProductCatalogQuery(projected, "kopułkowa")).toBe(true)
    expect(matchesProductCatalogQuery(projected, "kamery ip")).toBe(true)
    expect(matchesProductCatalogQuery(projected, "centrala alarmowa")).toBe(false)
  })
})

describe("product catalog session projection", () => {
  it("hides sale and reference prices from anonymous readers", () => {
    const [projected] = projectProductCatalogForSession([product], [])

    expect(projected.price).toBeNull()
    expect(projected.catalogPrice).toBeNull()
    expect(projected.priceHidden).toBe(true)
  })

  it("applies the current approved B2B account discount", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [
        {
          id: "u1",
          email: "partner@example.com",
          roleType: "BIZ",
          isApproved: true,
          discount: 15,
        },
      ],
      { id: "u1", email: "stale@example.com" }
    )

    expect(projected.price).toBe(85)
    expect(projected.catalogPrice).toBe(120)
    expect(projected.priceHidden).toBe(false)
  })

  it("does not grant B2B pricing through a reused email when the session id is stale", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [
        {
          id: "u_other",
          email: "reused@example.com",
          roleType: "BIZ",
          isApproved: true,
          discount: 50,
        },
      ],
      { id: "u_deleted", email: "reused@example.com" }
    )

    expect(projected.price).toBeNull()
    expect(projected.catalogPrice).toBeNull()
    expect(projected.priceHidden).toBe(true)
  })

  it("keeps blocked and pending B2B accounts price-hidden", () => {
    for (const user of [
      {
        id: "blocked",
        roleType: "BIZ",
        isApproved: true,
        isBlocked: true,
        discount: 20,
      },
      {
        id: "pending",
        roleType: "BIZ",
        isApproved: false,
        isBlocked: false,
        discount: 20,
      },
    ]) {
      const [projected] = projectProductCatalogForSession(
        [product],
        [user],
        { id: user.id }
      )
      expect(projected.priceHidden).toBe(true)
      expect(projected.price).toBeNull()
    }
  })

  it("keeps ADMIN on the active base sale price", () => {
    const [projected] = projectProductCatalogForSession(
      [product],
      [{ id: "admin", roleType: "ADMIN", isApproved: true, discount: 99 }],
      { id: "admin" }
    )

    expect(projected.price).toBe(100)
    expect(projected.priceHidden).toBe(false)
  })
})

describe("storefront catalog-content wiring", () => {
  it("enriches persisted storefront products without injecting virtual SKUs", () => {
    const shopPage = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/page.tsx"),
      "utf8"
    )
    const shopClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/ShopDashboardClient.tsx"),
      "utf8"
    )
    const productCard = fs.readFileSync(
      path.join(process.cwd(), "src/app/sklep/_components/ProductCard.tsx"),
      "utf8"
    )

    expect(shopPage).toContain("buildStoredProductCatalog")
    expect(shopPage).not.toContain("buildUnifiedProductCatalog")
    expect(shopClient).toContain("catalogSpecs")
    expect(shopClient).toContain("categoryName")
    expect(productCard).toContain("product.catalogSpecs")
  })
})

describe("catalog projection wiring", () => {
  it("uses the shared server projection instead of a session-losing self-fetch", () => {
    const publicPage = fs.readFileSync(path.join(process.cwd(), "src/app/produkty/page.tsx"), "utf8")
    const publicLoader = fs.readFileSync(path.join(process.cwd(), "src/app/produkty/catalog-data.ts"), "utf8")
    const detailPage = fs.readFileSync(path.join(process.cwd(), "src/app/produkty/[id]/page.tsx"), "utf8")
    const apiRoute = fs.readFileSync(path.join(process.cwd(), "src/app/api/products/route.ts"), "utf8")

    expect(publicPage).toContain("loadPublicCatalog(sessionUser)")
    expect(detailPage).toContain("loadPublicCatalog(sessionUser)")
    expect(publicLoader).toContain("buildProductCatalogView")
    expect(publicLoader).toContain("categories as ProductCatalogCategory[], sessionUser")
    expect(publicPage).toContain("buildCatalogCategoryOptions")
    expect(publicPage).toContain("getProductCatalogDescription")
    expect(publicPage).toContain("matchesProductCatalogQuery")
    expect(publicPage).toContain("matchesCatalogCategory")
    expect(apiRoute).toContain("buildProductCatalogView")
    expect(apiRoute).toContain("categories as ProductCatalogCategory[]")
    for (const source of [publicPage, publicLoader, detailPage]) {
      expect(source).not.toContain("/api/products")
      expect(source).not.toContain("NEXTAUTH_URL")
    }
  })
})
