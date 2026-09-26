import { describe, expect, it } from "vitest"
import {
  buildCartOfferPreview,
  createCartOfferReference,
} from "../cartOffer"

describe("cart offer preview", () => {
  it("resolves current server prices and ignores any client-side price concept", () => {
    const preview = buildCartOfferPreview(
      [{ id: "P1", quantity: 2 }],
      [{ id: "P1", sku: "SKU-1", name: "Produkt", price: 100, stock: 0 }],
      {
        role: "BIZ",
        discount: 10,
        companyName: "Partner Sp. z o.o.",
        nip: "1234567890",
        email: "partner@example.com",
      },
      {
        reference: "OFF-20260926-ABC12345",
        issuedAt: "2026-09-26T14:00:00.000Z",
      }
    )

    expect(preview.items).toEqual([
      {
        id: "P1",
        sku: "SKU-1",
        name: "Produkt",
        quantity: 2,
        unitPriceNet: 90,
        lineTotalNet: 180,
      },
    ])
    expect(preview.totalNet).toBe(180)
  })

  it("aggregates duplicate product lines before pricing", () => {
    const preview = buildCartOfferPreview(
      [
        { id: "P1", quantity: 2 },
        { id: "P1", quantity: 3 },
      ],
      [{ id: "P1", sku: "SKU-1", name: "Produkt", price: 12.34, stock: 1 }],
      { role: "BIZ", discount: 0 },
      {
        reference: "OFF-20260926-ABC12345",
        issuedAt: "2026-09-26T14:00:00.000Z",
      }
    )

    expect(preview.items).toHaveLength(1)
    expect(preview.items[0].quantity).toBe(5)
    expect(preview.items[0].lineTotalNet).toBe(61.7)
    expect(preview.totalNet).toBe(61.7)
  })

  it("does not treat offer generation as a stock reservation", () => {
    expect(() =>
      buildCartOfferPreview(
        [{ id: "P1", quantity: 100 }],
        [{ id: "P1", sku: "SKU-1", name: "Produkt", price: 10, stock: 0 }],
        { role: "BIZ", discount: 0 },
        {
          reference: "OFF-20260926-ABC12345",
          issuedAt: "2026-09-26T14:00:00.000Z",
        }
      )
    ).not.toThrow()
  })

  it("fails closed when a product has no active sale price", () => {
    expect(() =>
      buildCartOfferPreview(
        [{ id: "P1", quantity: 1 }],
        [{ id: "P1", sku: "SKU-1", name: "Produkt", price: 0, stock: 10 }],
        { role: "BIZ", discount: 0 },
        {
          reference: "OFF-20260926-ABC12345",
          issuedAt: "2026-09-26T14:00:00.000Z",
        }
      )
    ).toThrow("nie ma aktywnej ceny")
  })

  it("creates stable-format references without leaking raw UUID punctuation", () => {
    expect(
      createCartOfferReference(
        new Date("2026-09-26T23:59:59.000Z"),
        "ab-cd_12-34-rest"
      )
    ).toBe("OFF-20260926-ABCD1234")
  })
})
