// src/store/serverStore.ts
// Współdzielony stan serwerowy oparty na trwałym pliku JSON
import { readDbOrThrow, readDbStrict, withDbWriteLock, writeDb } from "@/lib/jsonDb"
import {
  PAYMENT_PROVIDER_IDS,
  getPaymentProviderDefinition,
  isPaymentProviderId,
  type PaymentProviderId,
} from "@/lib/paymentProviders"

type JsonRecord = Record<string, unknown>

type KnowledgeMeta = {
  sources: string[]
  processedSources: string[]
  lastUpdated: string | null
}

type KnowledgeEntries = Record<string, JsonRecord>

export type PaymentMethodConfig = {
  enabled: boolean
  displayName: string
  displayOrder: number
  maintenanceMessage: string | null
  updatedAt: string | null
}

export type PaymentMethodSettings = Record<
  PaymentProviderId,
  PaymentMethodConfig
>

export type PaymentControlSettings = {
  enabled: boolean
  maintenanceMessage: string | null
  updatedAt: string | null
}

export type PaymentOperationEvent = {
  id: string
  createdAt: string
  provider: PaymentProviderId
  operation: "RECONCILE"
  outcome: "SUCCESS" | "PARTIAL" | "FAILED"
  processed: number
  failed: number
  manualReview: number
}

export type PaymentWebhookEvent = {
  id: string
  createdAt: string
  provider: PaymentProviderId
  kind: "PAYMENT" | "REFUND"
  eventHash: string
}

export type PaymentAuditEntry = {
  id: string
  createdAt: string
  target: "GLOBAL" | PaymentProviderId
  operation: "SETTING_CHANGE" | "EMERGENCY_SHUTDOWN"
  actor: {
    id: string | null
    email: string | null
    name: string | null
  }
  previousEnabled: boolean
  nextEnabled: boolean
  previousMaintenanceMessage: string | null
  nextMaintenanceMessage: string | null
  previousDisplayName: string | null
  nextDisplayName: string | null
  previousDisplayOrder: number | null
  nextDisplayOrder: number | null
}

type ServerDb = {
  users: JsonRecord[]
  orders: JsonRecord[]
  repairs: JsonRecord[]
  categories: JsonRecord[]
  manufacturers: JsonRecord[]
  products: JsonRecord[]
  knowledgeMeta: KnowledgeMeta
  knowledgeEntries: KnowledgeEntries
  paymentMethods: PaymentMethodSettings
  paymentControl: PaymentControlSettings
  paymentAudit: PaymentAuditEntry[]
  paymentOperationEvents: PaymentOperationEvent[]
  paymentWebhookEvents: PaymentWebhookEvent[]
  [key: string]: unknown
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function recordArray(value: unknown, field: string): JsonRecord[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((entry) => !isRecord(entry))) {
    throw new Error(`DATABASE_FIELD_INVALID:${field}`)
  }
  return value as JsonRecord[]
}

function stringArray(value: unknown, field: string): string[] {
  if (value === undefined) return []
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new Error(`DATABASE_FIELD_INVALID:${field}`)
  }
  return value as string[]
}

function recordMap(value: unknown, field: string): KnowledgeEntries {
  if (value === undefined) return {}
  if (
    !isRecord(value) ||
    Object.values(value).some((entry) => !isRecord(entry))
  ) {
    throw new Error(`DATABASE_FIELD_INVALID:${field}`)
  }
  return value as KnowledgeEntries
}

function normalizePaymentWebhookEvents(value: unknown): PaymentWebhookEvent[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()

  return value
    .filter(isRecord)
    .flatMap((entry) => {
      if (
        typeof entry.id !== "string" ||
        typeof entry.createdAt !== "string" ||
        !Number.isFinite(Date.parse(entry.createdAt)) ||
        !isPaymentProviderId(entry.provider) ||
        (entry.kind !== "PAYMENT" && entry.kind !== "REFUND") ||
        typeof entry.eventHash !== "string" ||
        !/^[0-9a-f]{64}$/i.test(entry.eventHash)
      ) {
        return []
      }

      const eventHash = entry.eventHash.toLowerCase()
      if (seen.has(eventHash)) return []

      seen.add(eventHash)
      return [{
        id: eventHash,
        createdAt: entry.createdAt,
        provider: entry.provider,
        kind: entry.kind as PaymentWebhookEvent["kind"],
        eventHash,
      }]
    })
    .slice(0, 500)
}

function normalizePaymentOperationEvents(value: unknown): PaymentOperationEvent[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .flatMap((entry) => {
      if (
        typeof entry.id !== "string" ||
        typeof entry.createdAt !== "string" ||
        !Number.isFinite(Date.parse(entry.createdAt)) ||
        !isPaymentProviderId(entry.provider) ||
        entry.operation !== "RECONCILE" ||
        (entry.outcome !== "SUCCESS" &&
          entry.outcome !== "PARTIAL" &&
          entry.outcome !== "FAILED") ||
        typeof entry.processed !== "number" ||
        !Number.isSafeInteger(entry.processed) ||
        entry.processed < 0 ||
        typeof entry.failed !== "number" ||
        !Number.isSafeInteger(entry.failed) ||
        entry.failed < 0 ||
        typeof entry.manualReview !== "number" ||
        !Number.isSafeInteger(entry.manualReview) ||
        entry.manualReview < 0 ||
        entry.failed > entry.processed ||
        entry.manualReview > entry.processed
      ) {
        return []
      }

      return [
        {
          id: entry.id,
          createdAt: entry.createdAt,
          provider: entry.provider,
          operation: "RECONCILE" as const,
          outcome: entry.outcome as PaymentOperationEvent["outcome"],
          processed: entry.processed,
          failed: entry.failed,
          manualReview: entry.manualReview,
        },
      ]
    })
    .slice(0, 100)
}

function normalizePaymentAudit(value: unknown): PaymentAuditEntry[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(isRecord)
    .flatMap((entry) => {
      const actor = isRecord(entry.actor) ? entry.actor : {}
      const target: PaymentAuditEntry["target"] | null =
        entry.target === "GLOBAL"
          ? "GLOBAL"
          : isPaymentProviderId(entry.target)
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

      const operation: PaymentAuditEntry["operation"] =
        entry.operation === "EMERGENCY_SHUTDOWN"
          ? "EMERGENCY_SHUTDOWN"
          : "SETTING_CHANGE"

      return [
        {
          id: entry.id,
          createdAt: entry.createdAt,
          target,
          operation,
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
          previousDisplayName:
            typeof entry.previousDisplayName === "string"
              ? entry.previousDisplayName
              : null,
          nextDisplayName:
            typeof entry.nextDisplayName === "string"
              ? entry.nextDisplayName
              : null,
          previousDisplayOrder:
            typeof entry.previousDisplayOrder === "number" &&
            Number.isFinite(entry.previousDisplayOrder)
              ? entry.previousDisplayOrder
              : null,
          nextDisplayOrder:
            typeof entry.nextDisplayOrder === "number" &&
            Number.isFinite(entry.nextDisplayOrder)
              ? entry.nextDisplayOrder
              : null,
        },
      ]
    })
    .slice(0, 100)
}

export function normalizePaymentControl(value: unknown): PaymentControlSettings {
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

function normalizePaymentMethod(
  value: unknown,
  defaults: {
    enabled: boolean
    displayName: string
    displayOrder: number
  }
): PaymentMethodConfig {
  const source = isRecord(value) ? value : {}
  const displayName =
    typeof source.displayName === "string"
      ? source.displayName.trim().slice(0, 80)
      : ""
  const maintenanceMessage =
    typeof source.maintenanceMessage === "string"
      ? source.maintenanceMessage.trim().slice(0, 160) || null
      : null
  const displayOrder =
    typeof source.displayOrder === "number" &&
    Number.isSafeInteger(source.displayOrder) &&
    source.displayOrder >= 0 &&
    source.displayOrder <= 999
      ? source.displayOrder
      : defaults.displayOrder

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : defaults.enabled,
    displayName: displayName || defaults.displayName,
    displayOrder,
    maintenanceMessage,
    updatedAt:
      typeof source.updatedAt === "string" ? source.updatedAt : null,
  }
}

export function normalizePaymentMethods(value: unknown): PaymentMethodSettings {
  const source = isRecord(value) ? value : {}

  return Object.fromEntries(
    PAYMENT_PROVIDER_IDS.map((id) => {
      const defaults = getPaymentProviderDefinition(id).settingsDefaults
      return [id, normalizePaymentMethod(source[id], defaults)]
    })
  ) as PaymentMethodSettings
}

function assertOptionalPersistedPaymentControl(value: unknown) {
  if (value === undefined) return
  if (!isRecord(value)) {
    throw new Error("DATABASE_FIELD_INVALID:paymentControl")
  }
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error("DATABASE_FIELD_INVALID:paymentControl.enabled")
  }
  if (
    value.maintenanceMessage !== undefined &&
    value.maintenanceMessage !== null &&
    typeof value.maintenanceMessage !== "string"
  ) {
    throw new Error(
      "DATABASE_FIELD_INVALID:paymentControl.maintenanceMessage"
    )
  }
  if (
    value.updatedAt !== undefined &&
    value.updatedAt !== null &&
    typeof value.updatedAt !== "string"
  ) {
    throw new Error("DATABASE_FIELD_INVALID:paymentControl.updatedAt")
  }
}

function assertOptionalPersistedPaymentMethods(value: unknown) {
  if (value === undefined) return
  if (!isRecord(value)) {
    throw new Error("DATABASE_FIELD_INVALID:paymentMethods")
  }

  for (const id of PAYMENT_PROVIDER_IDS) {
    const config = value[id]
    if (config === undefined) continue
    if (!isRecord(config)) {
      throw new Error(`DATABASE_FIELD_INVALID:paymentMethods.${id}`)
    }
    if (config.enabled !== undefined && typeof config.enabled !== "boolean") {
      throw new Error(
        `DATABASE_FIELD_INVALID:paymentMethods.${id}.enabled`
      )
    }
    if (
      config.displayName !== undefined &&
      typeof config.displayName !== "string"
    ) {
      throw new Error(
        `DATABASE_FIELD_INVALID:paymentMethods.${id}.displayName`
      )
    }
    if (
      config.displayOrder !== undefined &&
      (!Number.isSafeInteger(config.displayOrder) ||
        Number(config.displayOrder) < 0 ||
        Number(config.displayOrder) > 999)
    ) {
      throw new Error(
        `DATABASE_FIELD_INVALID:paymentMethods.${id}.displayOrder`
      )
    }
    if (
      config.maintenanceMessage !== undefined &&
      config.maintenanceMessage !== null &&
      typeof config.maintenanceMessage !== "string"
    ) {
      throw new Error(
        `DATABASE_FIELD_INVALID:paymentMethods.${id}.maintenanceMessage`
      )
    }
    if (
      config.updatedAt !== undefined &&
      config.updatedAt !== null &&
      typeof config.updatedAt !== "string"
    ) {
      throw new Error(
        `DATABASE_FIELD_INVALID:paymentMethods.${id}.updatedAt`
      )
    }
  }
}

function normalizeDb(input: unknown): ServerDb {
  if (!isRecord(input)) {
    throw new Error("DATABASE_ROOT_INVALID")
  }

  const source = input
  if (
    source.knowledgeMeta !== undefined &&
    !isRecord(source.knowledgeMeta)
  ) {
    throw new Error("DATABASE_FIELD_INVALID:knowledgeMeta")
  }
  assertOptionalPersistedPaymentMethods(source.paymentMethods)
  assertOptionalPersistedPaymentControl(source.paymentControl)

  for (const [field, value] of [
    ["paymentAudit", source.paymentAudit],
    ["paymentOperationEvents", source.paymentOperationEvents],
    ["paymentWebhookEvents", source.paymentWebhookEvents],
  ] as const) {
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`DATABASE_FIELD_INVALID:${field}`)
    }
  }

  const knowledgeMeta = isRecord(source.knowledgeMeta)
    ? source.knowledgeMeta
    : {}

  return {
    ...source,
    users: recordArray(source.users, "users"),
    orders: recordArray(source.orders, "orders"),
    repairs: recordArray(source.repairs, "repairs"),
    categories: recordArray(source.categories, "categories"),
    manufacturers: recordArray(source.manufacturers, "manufacturers"),
    products: recordArray(source.products, "products"),
    knowledgeEntries: recordMap(source.knowledgeEntries, "knowledgeEntries"),
    paymentMethods: normalizePaymentMethods(source.paymentMethods),
    paymentControl: normalizePaymentControl(source.paymentControl),
    paymentAudit: normalizePaymentAudit(source.paymentAudit),
    paymentOperationEvents: normalizePaymentOperationEvents(
      source.paymentOperationEvents
    ),
    paymentWebhookEvents: normalizePaymentWebhookEvents(
      source.paymentWebhookEvents
    ),
    knowledgeMeta: {
      sources: stringArray(knowledgeMeta.sources, "knowledgeMeta.sources"),
      processedSources: stringArray(
        knowledgeMeta.processedSources,
        "knowledgeMeta.processedSources"
      ),
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
  const db = normalizeDb(readDbStrict())
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
    paymentOperationEvents: db.paymentOperationEvents,
    paymentWebhookEvents: db.paymentWebhookEvents,
    knowledgeMeta: db.knowledgeMeta,
    knowledgeEntries: db.knowledgeEntries,
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
