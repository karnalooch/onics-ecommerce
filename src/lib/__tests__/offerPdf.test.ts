import { describe, expect, it } from "vitest"
import {
  createOfferPdf,
  normalizePdfText,
} from "@/lib/offerPdf"

describe("B2B offer PDF", () => {
  it("normalizes Polish and unsupported characters for standard PDF fonts", () => {
    expect(
      normalizePdfText("Zażółć gęślą jaźń — €")
    ).toBe("Zazolc gesla jazn ? ?")
  })

  it("creates a valid PDF document from server-resolved offer data", async () => {
    const bytes = await createOfferPdf({
      offerId: "OFF-TEST-1",
      createdAt: "2026-09-26T10:00:00.000Z",
      customer: {
        companyName: "Instalacje Żółć Sp. z o.o.",
        email: "biuro@example.com",
        nip: "1234567890",
      },
      items: [
        {
          sku: "SKU-1",
          name: "Centrala alarmowa",
          quantity: 2,
          price: 123.45,
        },
      ],
      total: 246.9,
    })

    expect(bytes.byteLength).toBeGreaterThan(500)
    expect(
      Buffer.from(bytes.slice(0, 5)).toString("ascii")
    ).toBe("%PDF-")
  })

  it("paginates long offers without failing", async () => {
    const items = Array.from({ length: 80 }, (_, index) => ({
      sku: `SKU-${index + 1}`,
      name: `Produkt testowy ${index + 1}`,
      quantity: 1,
      price: 10,
    }))

    const bytes = await createOfferPdf({
      offerId: "OFF-LONG",
      createdAt: "2026-09-26T10:00:00.000Z",
      customer: { companyName: "Partner B2B" },
      items,
      total: 800,
    })

    expect(bytes.byteLength).toBeGreaterThan(1000)
  })
})
