import { describe, expect, it } from "vitest"
import {
  ORDER_IMPORT_MAX_BYTES,
  OrderImportError,
  buildOrderImportPreview,
  parseCeltronicsOrderXml,
} from "../orderImport"

const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<celtronics-order version="1">
  <item sku="SKU-1" quantity="2"/>
  <item quantity="3" sku="SKU-2"/>
</celtronics-order>`

describe("CELTRONICS_ORDER_XML_V1", () => {
  it("parses the documented strict XML contract", () => {
    expect(parseCeltronicsOrderXml(validXml)).toEqual({
      format: "CELTRONICS_ORDER_XML_V1",
      version: 1,
      items: [
        { line: 3, sku: "SKU-1", quantity: 2 },
        { line: 4, sku: "SKU-2", quantity: 3 },
      ],
    })
  })

  it("fails closed on DTD, ENTITY, comments and unsupported elements", () => {
    for (const xml of [
      `<!DOCTYPE foo><celtronics-order version="1"><item sku="A" quantity="1"/></celtronics-order>`,
      `<!ENTITY x "boom"><celtronics-order version="1"><item sku="A" quantity="1"/></celtronics-order>`,
      `<celtronics-order version="1"><!-- comment --><item sku="A" quantity="1"/></celtronics-order>`,
      `<celtronics-order version="1"><price>1</price></celtronics-order>`,
    ]) {
      expect(() => parseCeltronicsOrderXml(xml)).toThrow(OrderImportError)
    }
  })

  it("rejects text nodes, extra attributes and unsafe SKU syntax", () => {
    expect(() =>
      parseCeltronicsOrderXml(
        `<celtronics-order version="1">text<item sku="A" quantity="1"/></celtronics-order>`
      )
    ).toThrow("Tekst poza obsługiwanymi elementami")

    expect(() =>
      parseCeltronicsOrderXml(
        `<celtronics-order version="1" vendor="x"><item sku="A" quantity="1"/></celtronics-order>`
      )
    ).toThrow("nieobsługiwane lub brakujące atrybuty")

    expect(() =>
      parseCeltronicsOrderXml(
        `<celtronics-order version="1"><item sku="A&amp;B" quantity="1"/></celtronics-order>`
      )
    ).toThrow("Nieprawidłowy SKU")
  })

  it("enforces item and payload limits before preview", () => {
    const tooMany = Array.from(
      { length: 251 },
      (_, index) => `<item sku="SKU-${index}" quantity="1"/>`
    ).join("")

    expect(() =>
      parseCeltronicsOrderXml(
        `<celtronics-order version="1">${tooMany}</celtronics-order>`
      )
    ).toThrow("maksymalnie 250 pozycji")

    const oversized =
      `<celtronics-order version="1"><item sku="A" quantity="1"/></celtronics-order>` +
      " ".repeat(ORDER_IMPORT_MAX_BYTES)
    expect(() => parseCeltronicsOrderXml(oversized)).toThrow(
      "przekracza limit"
    )
  })

  it("resolves imported SKU through the server catalog and customer pricing", () => {
    const parsed = parseCeltronicsOrderXml(validXml)
    const preview = buildOrderImportPreview(
      parsed,
      [
        { id: "P1", sku: "SKU-1", name: "One", price: 100, stock: 10 },
        { id: "P2", sku: "SKU-2", name: "Two", price: 50, stock: 10 },
      ],
      { role: "BIZ", discount: 10 }
    )

    expect(preview.rejected).toEqual([])
    expect(preview.accepted).toEqual([
      {
        id: "P1",
        sku: "SKU-1",
        name: "One",
        price: 90,
        quantity: 2,
        sourceLines: [3],
      },
      {
        id: "P2",
        sku: "SKU-2",
        name: "Two",
        price: 45,
        quantity: 3,
        sourceLines: [4],
      },
    ])
  })

  it("produces a review report instead of failing the whole import for unknown SKU", () => {
    const parsed = parseCeltronicsOrderXml(validXml)
    const preview = buildOrderImportPreview(parsed, [
      { id: "P1", sku: "SKU-1", name: "One", price: 100, stock: 10 },
    ])

    expect(preview.accepted.map((item) => item.sku)).toEqual(["SKU-1"])
    expect(preview.rejected).toEqual([
      {
        sku: "SKU-2",
        quantity: 3,
        sourceLines: [4],
        reason: "SKU nie istnieje w aktualnym katalogu.",
      },
    ])
  })

  it("aggregates duplicate SKU before applying quantity and stock validation", () => {
    const parsed = parseCeltronicsOrderXml(
      `<celtronics-order version="1">
        <item sku="SKU-1" quantity="3"/>
        <item sku="SKU-1" quantity="4"/>
      </celtronics-order>`
    )

    const preview = buildOrderImportPreview(parsed, [
      { id: "P1", sku: "SKU-1", name: "One", price: 10, stock: 6 },
    ])

    expect(preview.accepted).toEqual([])
    expect(preview.rejected[0]).toMatchObject({
      sku: "SKU-1",
      quantity: 7,
    })
    expect(preview.rejected[0].reason).toContain("Brak wymaganej ilości")
  })
})
