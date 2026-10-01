import { describe, expect, it } from "vitest"
import {
  getProductCatalogDescription,
  matchesProductCatalogQuery,
  projectProductCatalogClassification,
  projectProductCatalogForSession,
  projectProductCatalogKnowledge,
  type ProductCatalogRecord,
} from "@/lib/productCatalogView"

const legacy: ProductCatalogRecord = {
  id: "copy-test",
  sku: "INTEGRA-128-PLUS",
  name: "INTEGRA-128-PLUS",
  manufacturer: "Nieznany",
  price: 100,
  stock: 7,
  categoryId: "alarm",
  subcategoryId: "boards",
  specs: "Płyta główna centrali alarmowej od 16 do128 wejść i wyjść | PLN | 0 | 0 | 0 | 1 | 5905033330375",
}
const categories = [{ id: "alarm", name: "Alarmy", subcategories: [{ id: "boards", name: "Płyty główne" }] }]

describe("catalog copy integration", () => {
  it("cleans legacy persisted copy in the view without mutating stored identity or commercial fields", () => {
    const before = structuredClone(legacy)
    const [view] = projectProductCatalogClassification([legacy], categories)
    expect(view.name).toBe("INTEGRA-128-PLUS — płyta główna centrali alarmowej od 16 do 128 wejść i wyjść")
    expect(getProductCatalogDescription(view)).toBe("Płyta główna centrali alarmowej od 16 do 128 wejść i wyjść. EAN: 5905033330375")
    expect(view).toMatchObject({ id: legacy.id, sku: legacy.sku, manufacturer: "Nieznany", price: 100, stock: 7, categoryId: "alarm", subcategoryId: "boards", categoryName: "Alarmy", subcategoryName: "Płyty główne" })
    expect(legacy).toEqual(before)
  })

  it("skips placeholder specs so real knowledge text can be displayed", () => {
    const [view] = projectProductCatalogKnowledge(
      [{ ...legacy, specs: "Parametry standardowe" }], categories,
      { [legacy.sku]: { specs: "Płyta główna&nbsp;centrali | PLN | 0 | 0 | 0 | 0 | 5905033330375" } },
      { includeVirtual: false }
    )
    expect(view.name).toBe("INTEGRA-128-PLUS — płyta główna centrali")
    expect(getProductCatalogDescription(view)).toBe("Płyta główna centrali. EAN: 5905033330375")
  })

  it("does not invent descriptions or delete possible source headings", () => {
    const heading = { ...legacy, sku: "INTEGRA", name: "INTEGRA", specs: "Parametry standardowe" }
    const views = projectProductCatalogClassification([heading], categories)
    expect(views).toHaveLength(1)
    expect(views[0].name).toBe("INTEGRA")
    expect(getProductCatalogDescription(views[0])).toBeNull()
  })

  it("retains model, EAN and descriptive search after cleanup", () => {
    const [view] = projectProductCatalogClassification([legacy], categories)
    for (const query of ["INTEGRA-128-PLUS", "5905033330375", "płyta główna", "do 128"]) {
      expect(matchesProductCatalogQuery(view, query)).toBe(true)
    }
    expect(matchesProductCatalogQuery(view, "PLN | 0")).toBe(false)
  })

  it("preserves guest, pending, blocked, BIZ and ADMIN pricing semantics", () => {
    const views = projectProductCatalogClassification([legacy], categories)
    const users = [
      { id: "pending", roleType: "BIZ", isApproved: false, discount: 17 },
      { id: "blocked", roleType: "BIZ", isApproved: true, isBlocked: true, discount: 17 },
      { id: "partner", roleType: "BIZ", isApproved: true, discount: 17 },
      { id: "admin", roleType: "ADMIN", isApproved: true, discount: 17 },
    ]
    for (const id of [undefined, "pending", "blocked"]) {
      const [view] = projectProductCatalogForSession(views, users, id ? { id } : undefined)
      expect(view.price).toBeNull()
      expect(view.catalogPrice).toBeNull()
      expect(view.priceHidden).toBe(true)
      expect(view.sku).toBe(legacy.sku)
    }
    expect(projectProductCatalogForSession(views, users, { id: "partner" })[0].price).toBe(83)
    expect(projectProductCatalogForSession(views, users, { id: "admin" })[0].price).toBe(100)
    expect(legacy.price).toBe(100)
  })

  it("normalizes knowledge-only copy without inventing sellable stock", () => {
    const [view] = projectProductCatalogKnowledge([], categories, {
      "MODULE-1": { model: "MODULE-1", specs: "Moduł wejść&nbsp;(8 wejść) | PLN | 0 | 0 | 0 | 0", price: 50 },
    }, { includeVirtual: true })
    expect(view.name).toBe("MODULE-1 — moduł wejść")
    expect(getProductCatalogDescription(view)).toBe("Moduł wejść (8 wejść)")
    expect(view.isVirtual).toBe(true)
    expect(view.stock).toBe(0)
    expect(view.price).toBe(0)
    expect(view.catalogPrice).toBe(50)
  })
})
