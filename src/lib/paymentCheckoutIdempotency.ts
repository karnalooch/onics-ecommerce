import { buildOrderSubmissionItemsFingerprint, type OrderSubmissionItem } from "@/lib/orderSubmissionIdempotency"

export type PaymentCheckoutIdempotencyStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type PaymentCheckoutRecord = {
  signature: string
  requestId: string
}

const STORAGE_KEY = "onics.payment-checkout-idempotency.v1"
const MAX_PENDING_RECORDS = 8
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function buildPaymentCheckoutFingerprint(input: {
  paymentMethod: string
  items: OrderSubmissionItem[]
}) {
  const paymentMethod = input.paymentMethod.trim()
  if (!paymentMethod) {
    throw new Error("Brak metody płatności do identyfikacji żądania.")
  }

  return JSON.stringify({
    paymentMethod,
    items: JSON.parse(buildOrderSubmissionItemsFingerprint(input.items)),
  })
}

export function buildPaymentCheckoutSignature(input: {
  ownerKey: string
  paymentMethod: string
  items: OrderSubmissionItem[]
}) {
  const ownerKey = input.ownerKey.trim()
  if (!ownerKey) {
    throw new Error("Brak właściciela żądania płatności.")
  }

  return JSON.stringify({
    ownerKey,
    fingerprint: JSON.parse(
      buildPaymentCheckoutFingerprint({
        paymentMethod: input.paymentMethod,
        items: input.items,
      })
    ),
  })
}

function readRecords(
  storage: PaymentCheckoutIdempotencyStorage | null
): PaymentCheckoutRecord[] {
  if (!storage) return []

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.signature === "string" &&
      typeof entry.requestId === "string" &&
      entry.signature &&
      UUID_RE.test(entry.requestId)
        ? [{ signature: entry.signature, requestId: entry.requestId }]
        : []
    ).slice(0, MAX_PENDING_RECORDS)
  } catch {
    return []
  }
}

function writeRecords(
  storage: PaymentCheckoutIdempotencyStorage | null,
  records: PaymentCheckoutRecord[]
) {
  if (!storage) return

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_PENDING_RECORDS))
    )
  } catch {
    // Retry continuity degrades gracefully when session storage is unavailable.
  }
}

export function getOrCreatePaymentCheckoutRequestId(
  input: {
    ownerKey: string
    paymentMethod: string
    items: OrderSubmissionItem[]
  },
  storage: PaymentCheckoutIdempotencyStorage | null,
  createRequestId: () => string
) {
  const signature = buildPaymentCheckoutSignature(input)
  const records = readRecords(storage)
  const existing = records.find((record) => record.signature === signature)
  if (existing) return existing.requestId

  const requestId = createRequestId().trim()
  if (!UUID_RE.test(requestId)) {
    throw new Error("Nie udało się utworzyć identyfikatora żądania płatności.")
  }

  writeRecords(storage, [
    { signature, requestId },
    ...records.filter((record) => record.requestId !== requestId),
  ])
  return requestId
}

export function clearPaymentCheckoutRequestId(
  requestId: string,
  storage: PaymentCheckoutIdempotencyStorage | null
) {
  const records = readRecords(storage)
  writeRecords(
    storage,
    records.filter((record) => record.requestId !== requestId)
  )
}
