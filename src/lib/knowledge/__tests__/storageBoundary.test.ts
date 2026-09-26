import { describe, expect, it } from "vitest"
import {
  buildKnowledgeEntriesForPersistence,
  buildKnowledgeFromDb,
} from "@/lib/knowledge/parser"

describe("knowledge storage boundary", () => {
  it("keeps extracted catalog data separate from the live product record", () => {
    const product = {
      sku: "SKU-1",
      name: "Live name",
      specs: "Live specs",
      price: 123,
      catalogPrice: 140,
      manufacturer: "Live manufacturer",
      lastUpdated: "2026-09-01T00:00:00.000Z",
    }

    const store = buildKnowledgeFromDb({
      products: [product],
      knowledgeEntries: {
        "SKU-1": {
          specs: "Supplier specs",
          price: 199,
          currency: "PLN",
          source: "supplier.xlsx",
          model: "Supplier model",
          manufacturer: "Supplier manufacturer",
        },
      },
    })

    expect(store.knowledge["SKU-1"]).toMatchObject({
      model: "Supplier model",
      specs: "Supplier specs",
      price: 199,
      manufacturer: "Supplier manufacturer",
      source: "supplier.xlsx",
    })
    expect(product).toMatchObject({
      name: "Live name",
      specs: "Live specs",
      price: 123,
      catalogPrice: 140,
      manufacturer: "Live manufacturer",
    })
  })

  it("keeps newly extracted SKUs in knowledge even when no live product exists", () => {
    const store = buildKnowledgeFromDb({
      products: [],
      knowledgeEntries: {
        "NEW-1": {
          specs: "Supplier-only specs",
          price: 88,
          currency: "PLN",
          source: "supplier.pdf",
          model: "NEW-1",
        },
      },
    })

    expect(store.knowledge["NEW-1"]).toMatchObject({
      price: 88,
      source: "supplier.pdf",
    })
  })

  it("persists only source-backed extracted knowledge, not product snapshots", () => {
    const entries = buildKnowledgeEntriesForPersistence({
      lastUpdated: "2026-09-26T00:00:00.000Z",
      sources: ["supplier.xlsx"],
      processedSources: ["supplier.xlsx"],
      knowledge: {
        "LIVE-1": {
          specs: "Live product specs",
          price: 10,
          currency: "PLN",
        },
        "EXTRACTED-1": {
          specs: "Supplier specs",
          price: 20,
          currency: "PLN",
          source: "supplier.xlsx",
        },
      },
    })

    expect(entries).toEqual({
      "EXTRACTED-1": expect.objectContaining({
        price: 20,
        source: "supplier.xlsx",
      }),
    })
  })

  it("ignores malformed persisted knowledge entries", () => {
    const store = buildKnowledgeFromDb({
      products: [],
      knowledgeEntries: {
        BROKEN: {
          specs: "",
          price: Number.NaN,
          currency: "PLN",
          source: "broken.xlsx",
        },
      },
    })

    expect(store.knowledge).toEqual({})
  })
})
