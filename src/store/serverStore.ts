// src/store/serverStore.ts
// Współdzielony stan serwerowy oparty na trwałym pliku JSON
import { readDb, withDbWriteLock, writeDb } from "@/lib/jsonDb"

type JsonRecord = Record<string, unknown>

type KnowledgeMeta = {
  sources: string[]
  processedSources: string[]
  lastUpdated: string | null
}

type ServerDb = {
  users: JsonRecord[]
  orders: JsonRecord[]
  repairs: JsonRecord[]
  categories: JsonRecord[]
  manufacturers: JsonRecord[]
  products: JsonRecord[]
  knowledgeMeta: KnowledgeMeta
  [key: string]: unknown
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

function normalizeDb(input: unknown): ServerDb {
  const source = isRecord(input) ? input : {}
  const knowledgeMeta = isRecord(source.knowledgeMeta)
    ? source.knowledgeMeta
    : {}

  return {
    ...source,
    users: recordArray(source.users),
    orders: recordArray(source.orders),
    repairs: recordArray(source.repairs),
    categories: recordArray(source.categories),
    manufacturers: recordArray(source.manufacturers),
    products: recordArray(source.products),
    knowledgeMeta: {
      sources: stringArray(knowledgeMeta.sources),
      processedSources: stringArray(knowledgeMeta.processedSources),
      lastUpdated:
        typeof knowledgeMeta.lastUpdated === "string"
          ? knowledgeMeta.lastUpdated
          : null,
    },
  }
}

/**
 * Pobiera najnowszy snapshot trwałej bazy.
 */
export function initializeMockData() {
  const db = normalizeDb(readDb())
  return {
    users: db.users,
    orders: db.orders,
    repairs: db.repairs,
    categories: db.categories,
    manufacturers: db.manufacturers,
    products: db.products,
    knowledgeMeta: db.knowledgeMeta,
  }
}

/**
 * Atomowa ścieżka mutacji dla file-backed store.
 *
 * Blokada obejmuje fresh read -> mutation -> atomic rename, więc równoległe
 * requesty nie zapisują snapshotów zbudowanych na przestarzałym stanie.
 */
export async function mutateMockData<T>(
  mutator: (db: ServerDb) => Promise<T> | T
): Promise<T> {
  return withDbWriteLock(async () => {
    const db = normalizeDb(readDb())
    const result = await mutator(db)

    if (!writeDb(db)) {
      throw new Error("Nie udało się utrwalić atomowej mutacji bazy danych.")
    }

    return result
  })
}
