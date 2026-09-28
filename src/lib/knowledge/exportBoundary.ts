import type { KnowledgeStore } from "@/lib/knowledge/types"

export const MAX_KNOWLEDGE_EXPORT_ENTRIES = 25_000
export const MAX_KNOWLEDGE_EXPORT_TEXT_CHARS = 8 * 1024 * 1024
export const MAX_KNOWLEDGE_EXPORT_CELL_CHARS = 32_000
export const MAX_KNOWLEDGE_EXPORT_BYTES = 32 * 1024 * 1024

type KnowledgeExportLimits = {
  maxEntries?: number
  maxTextChars?: number
  maxCellChars?: number
}

export class KnowledgeExportLimitError extends Error {
  constructor() {
    super("KNOWLEDGE_EXPORT_LIMIT")
    this.name = "KnowledgeExportLimitError"
  }
}

function assertPositiveLimit(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError("KNOWLEDGE_EXPORT_LIMIT_INVALID")
  }
}

function normalizedLimits(limits: KnowledgeExportLimits = {}) {
  const maxEntries = limits.maxEntries ?? MAX_KNOWLEDGE_EXPORT_ENTRIES
  const maxTextChars =
    limits.maxTextChars ?? MAX_KNOWLEDGE_EXPORT_TEXT_CHARS
  const maxCellChars =
    limits.maxCellChars ?? MAX_KNOWLEDGE_EXPORT_CELL_CHARS

  for (const value of [maxEntries, maxTextChars, maxCellChars]) {
    assertPositiveLimit(value)
  }

  return { maxEntries, maxTextChars, maxCellChars }
}

export function buildKnowledgeExportRows(
  store: KnowledgeStore,
  limits: KnowledgeExportLimits = {}
) {
  const { maxEntries, maxTextChars, maxCellChars } =
    normalizedLimits(limits)
  const entries = Object.entries(store.knowledge)

  if (entries.length > maxEntries) {
    throw new KnowledgeExportLimitError()
  }

  let totalTextChars = 0
  const rows = entries.map(([symbol, info]) => {
    const row = {
      "Model / Symbol": symbol,
      Cena: info.price ?? "",
      Specyfikacja: info.specs || "",
      Producent: info.manufacturer || "",
      Źródło: info.source || "Baza produktów",
      "Ostatnia aktualizacja":
        info.lastUpdated || store.lastUpdated || "",
    }

    for (const value of Object.values(row)) {
      const text = String(value ?? "")
      if (text.length > maxCellChars) {
        throw new KnowledgeExportLimitError()
      }
      totalTextChars += text.length
      if (totalTextChars > maxTextChars) {
        throw new KnowledgeExportLimitError()
      }
    }

    return row
  })

  return rows
}

export function assertKnowledgeExportBufferSize(
  buffer: Uint8Array,
  maxBytes = MAX_KNOWLEDGE_EXPORT_BYTES
) {
  assertPositiveLimit(maxBytes)
  if (buffer.byteLength > maxBytes) {
    throw new KnowledgeExportLimitError()
  }
}
