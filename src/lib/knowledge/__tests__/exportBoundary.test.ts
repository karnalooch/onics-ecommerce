import { describe, expect, it } from "vitest"
import {
  MAX_KNOWLEDGE_EXPORT_BYTES,
  MAX_KNOWLEDGE_EXPORT_CELL_CHARS,
  MAX_KNOWLEDGE_EXPORT_ENTRIES,
  MAX_KNOWLEDGE_EXPORT_TEXT_CHARS,
  KnowledgeExportLimitError,
  assertKnowledgeExportBufferSize,
  buildKnowledgeExportRows,
} from "@/lib/knowledge/exportBoundary"

const store = {
  lastUpdated: "2026-09-28T12:00:00.000Z",
  sources: [],
  processedSources: [],
  knowledge: {
    "SKU-1": {
      specs: "Specs",
      price: 10,
      currency: "PLN",
      manufacturer: "ACME",
      source: "catalog.xlsx",
    },
  },
}

describe("knowledge export resource budget", () => {
  it("keeps production export ceilings bounded", () => {
    expect(MAX_KNOWLEDGE_EXPORT_ENTRIES).toBe(25_000)
    expect(MAX_KNOWLEDGE_EXPORT_TEXT_CHARS).toBe(8 * 1024 * 1024)
    expect(MAX_KNOWLEDGE_EXPORT_CELL_CHARS).toBe(32_000)
    expect(MAX_KNOWLEDGE_EXPORT_BYTES).toBe(32 * 1024 * 1024)
  })

  it("builds rows within the configured budget", () => {
    expect(buildKnowledgeExportRows(store)).toEqual([
      expect.objectContaining({
        "Model / Symbol": "SKU-1",
        Cena: 10,
        Specyfikacja: "Specs",
      }),
    ])
  })

  it("fails closed before workbook generation when entry count is excessive", () => {
    expect(() =>
      buildKnowledgeExportRows(store, { maxEntries: 0 })
    ).toThrow("KNOWLEDGE_EXPORT_LIMIT_INVALID")

    expect(() =>
      buildKnowledgeExportRows(store, { maxEntries: 1 })
    ).not.toThrow()

    expect(() =>
      buildKnowledgeExportRows(
        {
          ...store,
          knowledge: {
            ...store.knowledge,
            "SKU-2": {
              specs: "Specs 2",
              price: 20,
              currency: "PLN",
            },
          },
        },
        { maxEntries: 1 }
      )
    ).toThrow(KnowledgeExportLimitError)
  })

  it("rejects oversized cells and aggregate text", () => {
    expect(() =>
      buildKnowledgeExportRows(store, { maxCellChars: 3 })
    ).toThrow(KnowledgeExportLimitError)

    expect(() =>
      buildKnowledgeExportRows(store, { maxTextChars: 5 })
    ).toThrow(KnowledgeExportLimitError)
  })

  it("caps the produced workbook buffer too", () => {
    expect(() =>
      assertKnowledgeExportBufferSize(new Uint8Array(4), 3)
    ).toThrow(KnowledgeExportLimitError)

    expect(() =>
      assertKnowledgeExportBufferSize(new Uint8Array(4), 4)
    ).not.toThrow()
  })
})
