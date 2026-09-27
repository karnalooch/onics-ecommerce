import { describe, expect, it } from "vitest"
import { validateCartOfferPreview } from "@/lib/cartOfferPreviewContract"

const request = [
  { id: "p1", quantity: 2 },
  { id: "p2", quantity: 1 },
]

const response = {
  reference: "OFF-20260927-ABC12345",
  issuedAt: "2026-09-27T00:30:00.000Z",
  currency: "PLN",
  customer: {
    companyName: "Partner Sp. z o.o.",
    nip: "1234567890",
    email: "partner@example.com",
  },
  items: [
    {
      id: "p1",
      sku: "SKU-1",
      name: "Produkt 1",
      quantity: 2,
      unitPriceNet: 12.34,
      lineTotalNet: 24.68,
    },
    {
      id: "p2",
      sku: "SKU-2",
      name: "Produkt 2",
      quantity: 1,
      unitPriceNet: 5,
      lineTotalNet: 5,
    },
  ],
  totalNet: 29.68,
}

describe("cart offer preview response contract", () => {
  it("accepts an exact, internally consistent offer response", () => {
    expect(validateCartOfferPreview(request, response)).toEqual(response)
  })

  it("normalizes item order back to request order", () => {
    const validated = validateCartOfferPreview(request, {
      ...response,
      items: [...response.items].reverse(),
    })

    expect(validated.items.map((item) => item.id)).toEqual(["p1", "p2"])
  })

  it("rejects missing, unexpected, duplicate, or mismatched quantities", () => {
    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: response.items.slice(0, 1),
      })
    ).toThrow(/niepełny/)

    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: [
          response.items[0],
          { ...response.items[1], id: "p3" },
        ],
      })
    ).toThrow(/nieoczekiwany/)

    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: [
          response.items[0],
          { ...response.items[1], id: "p1", quantity: 2, lineTotalNet: 24.68 },
        ],
        totalNet: 49.36,
      })
    ).toThrow(/zduplikowany/)

    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: [
          { ...response.items[0], quantity: 3, lineTotalNet: 37.02 },
          response.items[1],
        ],
        totalNet: 42.02,
      })
    ).toThrow(/inną ilość/)
  })

  it("rejects malformed metadata and financial fields", () => {
    expect(() =>
      validateCartOfferPreview(request, { ...response, currency: "EUR" })
    ).toThrow(/walutę/)

    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        issuedAt: "not-a-date",
      })
    ).toThrow(/datę/)

    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: [
          { ...response.items[0], unitPriceNet: Number.NaN },
          response.items[1],
        ],
      })
    ).toThrow(/ceny jednostkowej/)
  })

  it("rejects line totals that do not equal unit price times quantity", () => {
    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        items: [
          { ...response.items[0], lineTotalNet: 24.67 },
          response.items[1],
        ],
        totalNet: 29.67,
      })
    ).toThrow(/wartość pozycji/)
  })

  it("rejects a total that does not equal the validated line totals", () => {
    expect(() =>
      validateCartOfferPreview(request, {
        ...response,
        totalNet: 29.67,
      })
    ).toThrow(/sumę netto/)
  })
})
