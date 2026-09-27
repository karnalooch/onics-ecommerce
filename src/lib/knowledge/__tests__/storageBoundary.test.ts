import { describe, expect, it } from "vitest"
import {
  buildKnowledgeEntriesForPersistence,
  buildKnowledgeFromDb,
  buildMergedKnowledgePersistence,
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

  it("merges stale parser output into the fresh persistence snapshot", () => {
    const merged = buildMergedKnowledgePersistence(
      {
        products: [],
        knowledgeEntries: {
          "CONCURRENT-1": {
            specs: "Saved by another training job",
            price: 40,
            currency: "PLN",
            source: "concurrent.xlsx",
          },
        },
        knowledgeMeta: {
          sources: ["concurrent.xlsx"],
          processedSources: ["concurrent.xlsx"],
          lastUpdated: "2026-09-27T02:00:00.000Z",
        },
      },
      {
        lastUpdated: "2026-09-27T01:00:00.000Z",
        sources: ["incoming.xlsx"],
        processedSources: ["incoming.xlsx"],
        knowledge: {
          "INCOMING-1": {
            specs: "Parsed by the stale training snapshot",
            price: 20,
            currency: "PLN",
            source: "incoming.xlsx",
          },
        },
      }
    )

    expect(merged.knowledgeEntries).toMatchObject({
      "CONCURRENT-1": {
        price: 40,
        source: "concurrent.xlsx",
      },
      "INCOMING-1": {
        price: 20,
        source: "incoming.xlsx",
      },
    })
    expect(merged.knowledgeMeta.sources).toEqual([
      "concurrent.xlsx",
      "incoming.xlsx",
    ])
    expect(merged.knowledgeMeta.processedSources).toEqual([
      "concurrent.xlsx",
      "incoming.xlsx",
    ])
    expect(merged.knowledgeMeta.lastUpdated).toBe(
      "2026-09-27T02:00:00.000Z"
    )
  })

  it("preserves fresher same-SKU knowledge while unioning source provenance", () => {
    const merged = buildMergedKnowledgePersistence(
      {
        products: [],
        knowledgeEntries: {
          "SKU-1": {
            specs: "A much longer specification written by the concurrent job",
            price: 99,
            currency: "PLN",
            source: "fresh.pdf",
          },
        },
        knowledgeMeta: {
          sources: ["fresh.pdf"],
          processedSources: ["fresh.pdf"],
          lastUpdated: "2026-09-27T02:00:00.000Z",
        },
      },
      {
        lastUpdated: "2026-09-27T01:00:00.000Z",
        sources: ["stale.xlsx"],
        processedSources: ["stale.xlsx"],
        knowledge: {
          "SKU-1": {
            specs: "Short spec",
            price: 10,
            currency: "PLN",
            source: "stale.xlsx",
          },
        },
      }
    )

    expect(merged.knowledgeEntries["SKU-1"]).toMatchObject({
      specs: "A much longer specification written by the concurrent job",
      price: 99,
      source: "fresh.pdf, stale.xlsx",
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
