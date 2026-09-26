import { describe, expect, it } from "vitest"
import { validateAuthoritativeCartPreview } from "@/lib/cartPreviewContract"

const request = [
  { id: "p1", quantity: 2 },
  { id: "p2", quantity: 1 },
]

const response = [
  {
    id: "p1",
    sku: "SKU-1",
    name: "Produkt 1",
    price: 90,
    quantity: 2,
    availableStock: 5,
  },
  {
    id: "p2",
    sku: "SKU-2",
    name: "Produkt 2",
    price: 40,
    quantity: 1,
    availableStock: 3,
  },
]

describe("authoritative cart preview response contract", () => {
  it("accepts the exact requested product and quantity set", () => {
    expect(validateAuthoritativeCartPreview(request, response)).toEqual([
      {
        cartItem: {
          id: "p1",
          sku: "SKU-1",
          name: "Produkt 1",
          price: 90,
          quantity: 2,
        },
        availableStock: 5,
      },
      {
        cartItem: {
          id: "p2",
          sku: "SKU-2",
          name: "Produkt 2",
          price: 40,
          quantity: 1,
        },
        availableStock: 3,
      },
    ])
  })

  it("preserves request order even if the server response is reordered", () => {
    const validated = validateAuthoritativeCartPreview(
      request,
      [...response].reverse()
    )

    expect(validated.map((item) => item.cartItem.id)).toEqual(["p1", "p2"])
  })

  it("rejects missing or unexpected products", () => {
    expect(() =>
      validateAuthoritativeCartPreview(request, response.slice(0, 1))
    ).toThrow(/niepełny/)

    expect(() =>
      validateAuthoritativeCartPreview(request, [
        response[0],
        { ...response[1], id: "p3" },
      ])
    ).toThrow(/nieoczekiwany/)
  })

  it("rejects duplicate products and quantity mismatches", () => {
    expect(() =>
      validateAuthoritativeCartPreview(request, [
        response[0],
        { ...response[1], id: "p1", quantity: 2 },
      ])
    ).toThrow(/zduplikowany/)

    expect(() =>
      validateAuthoritativeCartPreview(request, [
        { ...response[0], quantity: 3 },
        response[1],
      ])
    ).toThrow(/inną ilość/)
  })

  it("rejects malformed authoritative product metadata", () => {
    expect(() =>
      validateAuthoritativeCartPreview(request, [
        { ...response[0], sku: "" },
        response[1],
      ])
    ).toThrow(/sku/)

    expect(() =>
      validateAuthoritativeCartPreview(request, [
        { ...response[0], price: "90" },
        response[1],
      ])
    ).toThrow(/cenę/)
  })
})
