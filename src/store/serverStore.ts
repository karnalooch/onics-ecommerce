// src/store/serverStore.ts
// Współdzielony stan serwerowy oparty na trwałym pliku JSON
import { readDb, readDbOrThrow, withDbWriteLock, writeDb } from "@/lib/jsonDb"

type JsonRecord = Record<string, unknown>

type KnowledgeMeta = {
  sources: string[]
  processedSources: string[]
  lastUpdated: string | null
}

export type PaymentMethodSettings = {
  STRIPE: {
    enabled: boolean
    updatedAt: string | null
  }
}

export type PaymentControlSettings = {
  enabled: boolean
  maintenanceMessage: string | null
  updatedAt: string | null
}

export type PaymentAuditEntry = {
  id: string
  createdAt: string
  target: "GLOBAL" | "STRIPE"
  actor: {
    id: string | null
    email: string | null
    name: string | null
  }
  previousEnabled: boolean
  nextEnabled: boolean
  previousMaintenanceMessage: string | null
  nextMaintenanceMessage: string | null
}

type ServerDb = {
  users: JsonRecord[]
  orders: JsonRecord[]
  repairs: JsonRecord[]
  categories: JsonRecord[]
  manufacturers: JsonRecord[]
  products: JsonRecord[]
  knowledgeMeta: KnowledgeMeta
  paymentMethods: PaymentMethodSettings
  paymentControl: PaymentControlSettings
  paymentAudit: PaymentAuditEntry[]
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

function normalizePaymentAudit(value: unknown): PaymentAuditEntry[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .flatMap((entry) => {
      const actor = isRecord(entry.actor) ? entry.actor : {}
      const target: PaymentAuditEntry["target"] | null =
        entry.target === "GLOBAL" || entry.target === "STRIPE"
          ? entry.target
          : null

      if (
        typeof entry.id !== "string" ||
        typeof entry.createdAt !== "string" ||
        !target ||
        typeof entry.previousEnabled !== "boolean" ||
        typeof entry.nextEnabled !== "boolean"
      ) {
        return []
      }

      return [
        {
          id: entry.id,
          createdAt: entry.createdAt,
          target,
          actor: {
            id: typeof actor.id === "string" ? actor.id : null,
            email: typeof actor.email === "string" ? actor.email : null,
            name: typeof actor.name === "string" ? actor.name : null,
          },
          previousEnabled: entry.previousEnabled,
          nextEnabled: entry.nextEnabled,
          previousMaintenanceMessage:
            typeof entry.previousMaintenanceMessage === "string"
              ? entry.previousMaintenanceMessage
              : null,
          nextMaintenanceMessage:
            typeof entry.nextMaintenanceMessage === "string"
              ? entry.nextMaintenanceMessage
              : null,
        },
      ]
    })
    .slice(0, 100)
}

function normalizePaymentControl(value: unknown): PaymentControlSettings {
  const source = isRecord(value) ? value : {}
  const maintenanceMessage =
    typeof source.maintenanceMessage === "string"
      ? source.maintenanceMessage.trim().slice(0, 160) || null
      : null

  return {
    enabled:
      typeof source.enabled === "boolean" ? source.enabled : true,
    maintenanceMessage,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : null,
  }
}

function normalizePaymentMethods(value: unknown): PaymentMethodSettings {
  const source = isRecord(value) ? value : {}
  const stripe = isRecord(source.STRIPE) ? source.STRIPE : {}

  return {
    STRIPE: {
      // Preserve existing installations: Stripe stays available until an
      // administrator explicitly disables it.
      enabled:
        typeof stripe.enabled === "boolean" ? stripe.enabled : true,
      updatedAt:
        typeof stripe.updatedAt === "string" ? stripe.updatedAt : null,
    },
  }
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
    paymentMethods: normalizePaymentMethods(source.paymentMethods),
    paymentControl: normalizePaymentControl(source.paymentControl),
    paymentAudit: normalizePaymentAudit(source.paymentAudit),
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
    paymentMethods: db.paymentMethods,
    paymentControl: db.paymentControl,
    paymentAudit: db.paymentAudit,
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
    const db = normalizeDb(readDbOrThrow())
    const result = await mutator(db)

    if (!writeDb(db)) {
      throw new Error("Nie udało się utrwalić atomowej mutacji bazy danych.")
    }

    return result
  })
}
