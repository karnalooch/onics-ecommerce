import { describe, expect, it } from "vitest"
import { catalogHref, catalogPriceState, catalogProductHref, paginateCatalog, readCatalogFilters, type PublicCatalogProduct } from "@/lib/publicCatalogPresentation"
const product: PublicCatalogProduct = { id: "device/01", sku: "A-1", name: "Test", price: 100, stock: 2, priceHidden: false }
describe("public catalog presentation", () => {
  it("preserves a shared search and category in pagination URLs", () => {
    const filters = readCatalogFilters({ q: "  kamera & IP ", category: "cat/1", page: "3" })
    expect(filters).toEqual({ query: "kamera & IP", category: "cat/1", requestedPage: 3 })
    expect(catalogHref(filters, 2)).toBe("/produkty?q=kamera+%26+IP&category=cat%2F1&page=2")
    expect(catalogProductHref(product, filters)).toBe("/produkty/device%2F01?q=kamera+%26+IP&category=cat%2F1&page=3")
  })
  it.each([undefined, "-1", "0", "1.5", "Infinity", "999999999999999999999"])("normalizes invalid page %s", (page) => {
    expect(readCatalogFilters({ page }).requestedPage).toBe(1)
  })
  it("does not interpret duplicate query keys as a scalar", () => {
    expect(readCatalogFilters({ q: ["a", "b"], category: ["x"], page: ["2"] })).toEqual({ query: "", category: "", requestedPage: 1 })
  })
  it("bounds output size and clamps the last page", () => {
    const values = Array.from({ length: 50 }, (_, i) => i)
    expect(paginateCatalog(values, 1).items).toHaveLength(24)
    expect(paginateCatalog(values, 99)).toEqual({ items: [48, 49], page: 3, pages: 3, total: 50, from: 49, to: 50 })
    expect(paginateCatalog([], 5)).toEqual({ items: [], page: 1, pages: 1, total: 0, from: 0, to: 0 })
  })
  it("fails closed if account visibility is not explicitly projected", () => {
    expect(catalogPriceState(product, false)).toBe("login")
    expect(catalogPriceState({ ...product, priceHidden: true }, true)).toBe("restricted")
    expect(catalogPriceState({ ...product, priceHidden: undefined }, true)).toBe("restricted")
    expect(catalogPriceState(product, true)).toBe("visible")
  })
  it.each([0, -1, null, undefined, NaN, Infinity])("does not show unknown/invalid price %s as a purchasable price", (price) => {
    expect(catalogPriceState({ ...product, price }, true)).toBe("unpriced")
  })
})
