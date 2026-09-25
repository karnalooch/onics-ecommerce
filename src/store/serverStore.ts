import { readDb, writeDb } from "@/lib/jsonDb"

type KnowledgeMeta = {
  sources: unknown[]
  processedSources: unknown[]
  lastUpdated: string | null
}

type ServerState = {
  users: unknown[]
  categories: unknown[]
  manufacturers: unknown[]
  products: unknown[]
  orders: unknown[]
  repairs: unknown[]
  knowledgeMeta: KnowledgeMeta
}

const EMPTY_KNOWLEDGE_META: KnowledgeMeta = {
  sources: [],
  processedSources: [],
  lastUpdated: null,
}

let currentState: ServerState | null = null

function normalizeState(value: unknown): ServerState {
  const db =
    value && typeof value === "object"
      ? (value as Partial<ServerState>)
      : {}

  return {
    users: Array.isArray(db.users) ? db.users : [],
    categories: Array.isArray(db.categories) ? db.categories : [],
    manufacturers: Array.isArray(db.manufacturers) ? db.manufacturers : [],
    products: Array.isArray(db.products) ? db.products : [],
    orders: Array.isArray(db.orders) ? db.orders : [],
    repairs: Array.isArray(db.repairs) ? db.repairs : [],
    knowledgeMeta:
      db.knowledgeMeta && typeof db.knowledgeMeta === "object"
        ? {
            sources: Array.isArray(db.knowledgeMeta.sources)
              ? db.knowledgeMeta.sources
              : [],
            processedSources: Array.isArray(db.knowledgeMeta.processedSources)
              ? db.knowledgeMeta.processedSources
              : [],
            lastUpdated:
              typeof db.knowledgeMeta.lastUpdated === "string"
                ? db.knowledgeMeta.lastUpdated
                : null,
          }
        : { ...EMPTY_KNOWLEDGE_META },
  }
}

/**
 * Ładuje bieżący snapshot z trwałego pliku JSON.
 * Zwrócone tablice są tym samym stanem, który saveMockData() zapisze po mutacji.
 */
export function initializeMockData() {
  currentState = normalizeState(readDb())
  return currentState
}

/**
 * Zapisuje ostatnio zainicjalizowany snapshot.
 */
export function saveMockData() {
  if (!currentState) {
    return false
  }

  return writeDb(currentState)
}
