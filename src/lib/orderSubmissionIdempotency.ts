export type OrderSubmissionType = "INQUIRY" | "ORDER"

export type OrderSubmissionItem = {
  id: string
  quantity: number
}

type IdempotencyRecord = {
  signature: string
  requestId: string
}

export type IdempotencyStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = "onics.order-submission-idempotency.v1"
const MAX_PENDING_RECORDS = 8

function normalizedItems(items: OrderSubmissionItem[]) {
  const quantities = new Map<string, number>()

  for (const item of items) {
    const id = String(item.id ?? "").trim()
    const quantity = Number(item.quantity)
    if (
      !id ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error("Nieprawidłowy koszyk do identyfikacji żądania.")
    }

    const total = (quantities.get(id) ?? 0) + quantity
    if (!Number.isSafeInteger(total)) {
      throw new Error("Nieprawidłowy koszyk do identyfikacji żądania.")
    }
    quantities.set(id, total)
  }

  return [...quantities.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, quantity]) => ({ id, quantity }))
}

export function buildOrderSubmissionSignature(input: {
  ownerKey: string
  orderType: OrderSubmissionType
  items: OrderSubmissionItem[]
}) {
  const ownerKey = input.ownerKey.trim()
  if (!ownerKey) {
    throw new Error("Brak właściciela żądania zamówienia.")
  }

  return JSON.stringify({
    ownerKey,
    orderType: input.orderType,
    items: normalizedItems(input.items),
  })
}

export function sameOrderSubmissionItems(
  requested: OrderSubmissionItem[],
  stored: OrderSubmissionItem[]
) {
  return (
    JSON.stringify(normalizedItems(requested)) ===
    JSON.stringify(normalizedItems(stored))
  )
}

function readRecords(storage: IdempotencyStorage): IdempotencyRecord[] {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.signature === "string" &&
      typeof entry.requestId === "string" &&
      entry.signature &&
      entry.requestId
        ? [{
            signature: entry.signature,
            requestId: entry.requestId,
          }]
        : []
    ).slice(0, MAX_PENDING_RECORDS)
  } catch {
    return []
  }
}

function writeRecords(
  storage: IdempotencyStorage,
  records: IdempotencyRecord[]
) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(records.slice(0, MAX_PENDING_RECORDS))
  )
}

export function getOrCreateOrderSubmissionRequestId(
  input: {
    ownerKey: string
    orderType: OrderSubmissionType
    items: OrderSubmissionItem[]
  },
  storage: IdempotencyStorage,
  createRequestId: () => string
) {
  const signature = buildOrderSubmissionSignature(input)
  const records = readRecords(storage)
  const existing = records.find((record) => record.signature === signature)

  if (existing) {
    return existing.requestId
  }

  const requestId = createRequestId().trim()
  if (!requestId) {
    throw new Error("Nie udało się utworzyć identyfikatora żądania.")
  }

  writeRecords(storage, [
    { signature, requestId },
    ...records.filter((record) => record.requestId !== requestId),
  ])

  return requestId
}

export function clearOrderSubmissionRequestId(
  requestId: string,
  storage: IdempotencyStorage
) {
  const records = readRecords(storage)
  writeRecords(
    storage,
    records.filter((record) => record.requestId !== requestId)
  )
}
