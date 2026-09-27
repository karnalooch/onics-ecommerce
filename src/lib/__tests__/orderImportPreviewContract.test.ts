import { describe, expect, it } from "vitest"
import { parseCeltronicsOrderXml } from "@/lib/orderImport"
import { validateOrderImportPreview } from "@/lib/orderImportPreviewContract"

const parsed = parseCeltronicsOrderXml(`<celtronics-order version="1">
  <item sku="SKU-1" quantity="2"/>
  <item sku="SKU-1" quantity="3"/>
  <item sku="SKU-2" quantity="1"/>
</celtronics-order>`)

const response = {
  format: "CELTRONICS_ORDER_XML_V1",
  version: 1,
  accepted: [
    {
      id: "P1",
      sku: "SKU-1",
      name: "Produkt 1",
      price: 12.34,
      quantity: 5,
      sourceLines: [2, 3],
    },
  ],
  rejected: [
    {
      sku: "SKU-2",
      quantity: 1,
      sourceLines: [4],
      reason: "Brak wymaganej ilości produktu SKU-2.",
    },
  ],
  summary: {
    sourceLines: 3,
    acceptedLines: 2,
    rejectedLines: 1,
    acceptedQuantity: 5,
    rejectedQuantity: 1,
  },
}

describe("order import preview response contract", () => {
  it("accepts an exact response tied to the parsed XML request", () => {
    expect(validateOrderImportPreview(parsed, response)).toEqual(response)
  })

  it("rejects malformed, missing, unexpected, or duplicate result sets", () => {
    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: undefined,
      })
    ).toThrow(/listę pozycji/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        rejected: [
          {
            ...response.rejected[0],
            sku: "SKU-X",
          },
        ],
      })
    ).toThrow(/nieoczekiwane SKU/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        rejected: [
          {
            ...response.rejected[0],
            sku: "SKU-1",
            quantity: 5,
            sourceLines: [2, 3],
          },
        ],
      })
    ).toThrow(/zduplikowane SKU/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        rejected: [],
        summary: {
          ...response.summary,
          rejectedLines: 0,
          rejectedQuantity: 0,
        },
      })
    ).toThrow(/niepełny zestaw/)
  })

  it("rejects quantity and source-line mismatches against the XML", () => {
    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: [
          {
            ...response.accepted[0],
            quantity: 4,
          },
        ],
      })
    ).toThrow(/inną ilość/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: [
          {
            ...response.accepted[0],
            sourceLines: [2, 4],
          },
        ],
      })
    ).toThrow(/inne linie źródłowe/)
  })

  it("rejects invalid accepted product fields and money", () => {
    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: [
          {
            ...response.accepted[0],
            id: "",
          },
        ],
      })
    ).toThrow(/id produktu/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: [
          {
            ...response.accepted[0],
            price: Number.NaN,
          },
        ],
      })
    ).toThrow(/cenę/)

    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        accepted: [
          {
            ...response.accepted[0],
            price: 12.345,
          },
        ],
      })
    ).toThrow(/cenę/)
  })

  it("rejects inconsistent summary counters", () => {
    expect(() =>
      validateOrderImportPreview(parsed, {
        ...response,
        summary: {
          ...response.summary,
          acceptedQuantity: 4,
        },
      })
    ).toThrow(/niespójne podsumowanie/)
  })
})
