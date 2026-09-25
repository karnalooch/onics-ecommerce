// src/store/serverStore.ts
// Współdzielony stan serwerowy oparty na trwałym pliku JSON
import { readDb, withDbWriteLock, writeDb } from "@/lib/jsonDb"

type ServerDb = {
  users: any[]
  orders: any[]
  repairs: any[]
  categories: any[]
  manufacturers: any[]
  products: any[]
  knowledgeMeta: {
    sources: string[]
    processedSources: string[]
    lastUpdated: string | null
  }
  [key: string]: any
}

function normalizeDb(input: any): ServerDb {
  return {
    ...(input || {}),
    users: Array.isArray(input?.users) ? input.users : [],
    orders: Array.isArray(input?.orders) ? input.orders : [],
    repairs: Array.isArray(input?.repairs) ? input.repairs : [],
    categories: Array.isArray(input?.categories) ? input.categories : [],
    manufacturers: Array.isArray(input?.manufacturers) ? input.manufacturers : [],
    products: Array.isArray(input?.products) ? input.products : [],
    knowledgeMeta: {
      sources: Array.isArray(input?.knowledgeMeta?.sources)
        ? input.knowledgeMeta.sources
        : [],
      processedSources: Array.isArray(input?.knowledgeMeta?.processedSources)
        ? input.knowledgeMeta.processedSources
        : [],
      lastUpdated: input?.knowledgeMeta?.lastUpdated ?? null,
    },
  }
}

function hydrateGlobals(db: ServerDb) {
  ;(global as any).mockUsersStore = db.users
  ;(global as any).mockCategoriesStore = db.categories
  ;(global as any).mockManufacturersStore = db.manufacturers
  ;(global as any).mockProductsStore = db.products
  ;(global as any).mockOrdersStore = db.orders
  ;(global as any).mockRepairsStore = db.repairs
  ;(global as any).mockKnowledgeMetaStore = db.knowledgeMeta
}

/**
 * Pobiera najnowszy snapshot trwałej bazy.
 */
export function initializeMockData() {
  const db = normalizeDb(readDb())
  hydrateGlobals(db)

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

    hydrateGlobals(db)
    return result
  })
}

/**
 * Legacy write path. Pozostaje tymczasowo dla modułów jeszcze nieprzeniesionych
 * na mutateMockData(). Nie używać w nowym kodzie.
 */
export function saveMockData() {
  const db = normalizeDb({
    users: (global as any).mockUsersStore,
    categories: (global as any).mockCategoriesStore,
    manufacturers: (global as any).mockManufacturersStore,
    products: (global as any).mockProductsStore,
    orders: (global as any).mockOrdersStore,
    repairs: (global as any).mockRepairsStore,
    knowledgeMeta: (global as any).mockKnowledgeMetaStore,
  })

  return writeDb(db)
}
