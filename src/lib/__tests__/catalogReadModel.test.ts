import { describe, expect, it } from "vitest"
import { projectCatalogProducts } from "@/lib/catalogReadModel"

const products = [
  {
    id: "p1",
    sku: "SKU-1",
    name: "Centrala",
    price: 1000,
    stock: 4,
    manufacturer: "NIEZNANY",
    categoryId: "c1",
    subcategoryId: "s1",
  },
]

const categories = [
  {
    id: "c1",
    name: "SSWIN",
    subcategories: [{ id: "s1", name: "Centrale Alarmowe" }],
  },
]

const knowledge = {
  "SKU-1": {
    manufacturer: "SATEL",
    specs: "16 wejść",
    price: 1200,
  },
  "VIRTUAL-1": {
    model: "Wirtualny produkt",
    manufacturer: "BCS",
    specs: "4 kanały",
    price: 500,
    category: "CCTV",
    subcategory: "Rejestratory",
  },
}

describe("catalog read model", () => {
  it("derives display classification and hides prices for anonymous viewers", () => {
    const result = projectCatalogProducts(
      products,
      categories,
      knowledge
    )

    expect(result[0]).toMatchObject({
      id: "p1",
      manufacturer: "SATEL",
      specs: "16 wejść",
      categoryName: "SSWIN",
      subcategoryName: "Centrale Alarmowe",
      price: null,
      catalogPrice: null,
      priceHidden: true,
    })
  })

  it("uses the current approved B2B discount", () => {
    const result = projectCatalogProducts(
      products,
      categories,
      knowledge,
      {
        roleType: "BIZ",
        isApproved: true,
        isBlocked: false,
        discount: 10,
      }
    )

    expect(result[0]).toMatchObject({
      id: "p1",
      price: 900,
      priceHidden: false,
      categoryName: "SSWIN",
    })
  })

  it("fails closed for pending or blocked B2B viewers", () => {
    const pending = projectCatalogProducts(
      products,
      categories,
      knowledge,
      { roleType: "BIZ", isApproved: false, discount: 10 }
    )
    const blocked = projectCatalogProducts(
      products,
      categories,
      knowledge,
      {
        roleType: "BIZ",
        isApproved: true,
        isBlocked: true,
        discount: 10,
      }
    )

    expect(pending[0].priceHidden).toBe(true)
    expect(pending[0].price).toBeNull()
    expect(blocked[0].priceHidden).toBe(true)
    expect(blocked[0].price).toBeNull()
  })

  it("keeps knowledge-only products usable by the public catalog", () => {
    const result = projectCatalogProducts(
      products,
      categories,
      knowledge
    )
    const virtual = result.find(
      (product) => product.id === "virtual_VIRTUAL-1"
    )

    expect(virtual).toMatchObject({
      sku: "VIRTUAL-1",
      name: "Wirtualny produkt",
      manufacturer: "BCS",
      specs: "4 kanały",
      categoryName: "CCTV",
      subcategoryName: "Rejestratory",
      price: null,
      priceHidden: true,
      isVirtual: true,
    })
  })
})
