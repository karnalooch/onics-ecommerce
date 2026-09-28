import { createHash, timingSafeEqual } from "node:crypto"
import { moneyToMinorUnits } from "@/lib/payments"
import {
  normalizePrzelewy24OrderId,
  parsePrzelewy24Json,
  przelewy24OrderIdsEqual,
  serializePrzelewy24Json,
  type Przelewy24OrderId,
} from "@/lib/przelewy24Json"
import {
  releaseInventory,
  type InventoryProduct,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"

export type Przelewy24RuntimeOptions = {
  nodeEnv?: string
  requestUrl?: string | null
  appUrl?: string | null
  merchantId?: string | null
  posId?: string | null
  apiKey?: string | null
  crc?: string | null
}

export type Przelewy24Config = {
  merchantId: number
  posId: number
  apiKey: string
  crc: string
  appUrl: string
  apiBaseUrl: string
  environment: "sandbox" | "production"
}

export type Przelewy24Notification = {
  merchantId: number
  posId: number
  sessionId: string
  amount: number
  originAmount: number
  currency: string
  orderId: Przelewy24OrderId
  methodId: number
  statement: string
  sign: string
}

export type Przelewy24TransactionDetails = {
  orderId: Przelewy24OrderId
  sessionId: string
  status: number
  amount: number
  currency: string
  statement?: string
  paymentMethod?: number
}

export type Przelewy24RefundDetails = {
  orderId: Przelewy24OrderId
  sessionId: string
  amount: number
  currency: string
  refunds: Array<{
    batchId?: number
    requestId: string
    date?: string
    login?: string
    description?: string
    status: number
    amount: number
  }>
}

export type Przelewy24RefundNotification = {
  orderId: Przelewy24OrderId
  sessionId: string
  merchantId: number
  requestId: string
  refundsUuid: string
  amount: number
  currency: string
  timestamp: number
  status: 0 | 1
  sign: string
}

export type Przelewy24StoredOrder = InventoryReservationOrder & {
  id: string
  status?: string | null
  paymentProvider?: unknown
  totalPriceFinal?: number | null
  paymentStatus?: string | null
  paymentCheckoutRegistrationStatus?: string | null
  p24SessionId?: string | null
  p24OrderId?: Przelewy24OrderId | null
  p24LastNotificationSign?: string | null
  p24VerificationPending?: Przelewy24Notification | null
  p24VerificationPendingAt?: string | null
  paidAt?: string | null
  paymentUpdatedAt?: string | null
  paymentReconciledAt?: string | null
  refundedAt?: string | null
  cancelledAt?: string | null
  refundStatus?: string | null
  refundRequestedAt?: string | null
  refundUpdatedAt?: string | null
  returnStatus?: "REQUESTED" | "RECEIVED" | "REFUND_PENDING" | "COMPLETED" | null
  returnRequestedAt?: string | null
  returnReceivedAt?: string | null
  returnUpdatedAt?: string | null
  returnCompletedAt?: string | null
  p24RefundAttempt?: number | null
  p24RefundRequestId?: string | null
  p24RefundsUuid?: string | null
  p24LastRefundNotificationSign?: string | null
}

function numericCredential(value: string | null | undefined) {
  if (!value?.trim() || !/^\d+$/.test(value.trim())) return null
  const parsed = Number(value.trim())
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function productionOrigin(value: string | null | undefined) {
  if (!value?.trim()) return null

  try {
    const parsed = new URL(value.trim())
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null
    }
    return parsed.origin
  } catch {
    return null
  }
}

function developmentOrigin(
  configured: string | null | undefined,
  requestUrl: string | null | undefined
) {
  if (configured?.trim()) {
    try {
      return new URL(configured.trim()).origin
    } catch {
      // Fall back to the current request origin below.
    }
  }

  if (requestUrl?.trim()) {
    try {
      return new URL(requestUrl.trim()).origin
    } catch {
      return null
    }
  }

  return null
}

export function resolvePrzelewy24Config(
  options: Przelewy24RuntimeOptions = {}
): Przelewy24Config {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const production = nodeEnv === "production"
  const merchantId = numericCredential(
    options.merchantId ?? process.env.P24_MERCHANT_ID
  )
  const posId = numericCredential(options.posId ?? process.env.P24_POS_ID)
  const apiKey = (options.apiKey ?? process.env.P24_API_KEY)?.trim() ?? ""
  const crc = (options.crc ?? process.env.P24_CRC)?.trim() ?? ""
  const configuredAppUrl =
    options.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? null
  const appUrl = production
    ? productionOrigin(configuredAppUrl)
    : developmentOrigin(configuredAppUrl, options.requestUrl)

  if (!merchantId || !posId || !apiKey || !crc || !appUrl) {
    throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED")
  }

  return {
    merchantId,
    posId,
    apiKey,
    crc,
    appUrl,
    apiBaseUrl: production
      ? "https://secure.przelewy24.pl"
      : "https://sandbox.przelewy24.pl",
    environment: production ? "production" : "sandbox",
  }
}

export function describePrzelewy24Runtime(
  options: Przelewy24RuntimeOptions = {}
) {
  try {
    const config = resolvePrzelewy24Config(options)
    return {
      configured: true,
      webhookConfigured: true,
      configurationIssues: [] as const,
      environment: config.environment,
    }
  } catch {
    const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
    const merchantId = numericCredential(
      options.merchantId ?? process.env.P24_MERCHANT_ID
    )
    const posId = numericCredential(options.posId ?? process.env.P24_POS_ID)
    const apiKey = (options.apiKey ?? process.env.P24_API_KEY)?.trim() ?? ""
    const crc = (options.crc ?? process.env.P24_CRC)?.trim() ?? ""
    const configuredAppUrl =
      options.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? null
    const appUrlValid =
      nodeEnv === "production"
        ? Boolean(productionOrigin(configuredAppUrl))
        : Boolean(developmentOrigin(configuredAppUrl, options.requestUrl))

    return {
      configured: false,
      webhookConfigured: false,
      configurationIssues: [
        ...(!merchantId || !posId || !apiKey || !crc
          ? (["CREDENTIALS_MISSING"] as const)
          : []),
        ...(!appUrlValid ? (["PUBLIC_APP_URL_INVALID"] as const) : []),
      ],
      environment:
        nodeEnv === "production"
          ? ("production" as const)
          : ("sandbox" as const),
    }
  }
}

export function calculatePrzelewy24Sign(payload: Record<string, unknown>) {
  return createHash("sha384")
    .update(serializePrzelewy24Json(payload), "utf8")
    .digest("hex")
}

function safeEqualHex(left: string, right: string) {
  if (
    !/^[0-9a-f]{96}$/i.test(left) ||
    !/^[0-9a-f]{96}$/i.test(right)
  ) {
    return false
  }

  const a = Buffer.from(left, "hex")
  const b = Buffer.from(right, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export function verifyPrzelewy24NotificationSignature(
  notification: Przelewy24Notification,
  config: Przelewy24Config
) {
  if (
    notification.merchantId !== config.merchantId ||
    notification.posId !== config.posId
  ) {
    return false
  }

  const expected = calculatePrzelewy24Sign({
    merchantId: notification.merchantId,
    posId: notification.posId,
    sessionId: notification.sessionId,
    amount: notification.amount,
    originAmount: notification.originAmount,
    currency: notification.currency,
    orderId: notification.orderId,
    methodId: notification.methodId,
    statement: notification.statement,
    crc: config.crc,
  })

  return safeEqualHex(notification.sign, expected)
}

function basicAuth(config: Przelewy24Config) {
  return (
    "Basic " +
    Buffer.from(`${config.posId}:${config.apiKey}`).toString("base64")
  )
}

export async function testPrzelewy24Access(
  config: Przelewy24Config,
  requestSignal?: AbortSignal
) {
  let response: Response

  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/testAccess`, {
      method: "GET",
      headers: {
        Authorization: basicAuth(config),
      },
      signal: requestSignal
        ? AbortSignal.any([requestSignal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Error("PRZELEWY24_ACCESS_UNAVAILABLE")
  }

  if (response.status === 401) {
    throw new Error("PRZELEWY24_ACCESS_UNAUTHORIZED")
  }
  if (response.status >= 500) {
    throw new Error("PRZELEWY24_ACCESS_UNAVAILABLE")
  }

  const payload = (await response.json().catch(() => null)) as
    | { data?: unknown }
    | null

  if (!response.ok || payload?.data !== true) {
    throw new Error("PRZELEWY24_ACCESS_REJECTED")
  }

  return true
}

export async function registerPrzelewy24Transaction(
  config: Przelewy24Config,
  input: {
    sessionId: string
    amount: number
    email: string
    description: string
  }
) {
  const sign = calculatePrzelewy24Sign({
    sessionId: input.sessionId,
    merchantId: config.merchantId,
    amount: input.amount,
    currency: "PLN",
    crc: config.crc,
  })

  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/transaction/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuth(config),
      },
      body: JSON.stringify({
        merchantId: config.merchantId,
        posId: config.posId,
        sessionId: input.sessionId,
        amount: input.amount,
        currency: "PLN",
        description: input.description,
        email: input.email,
        country: "PL",
        language: "pl",
        urlReturn:
          `${config.appUrl}/oferty/zamowienia?payment=success&provider=PRZELEWY24&session_id=${encodeURIComponent(input.sessionId)}`,
        urlStatus: `${config.appUrl}/api/webhooks/przelewy24`,
        sign,
      }),
      signal: AbortSignal.timeout(10_000),
    }
  )

  const payload = (await response.json().catch(() => null)) as
    | { data?: { token?: unknown } }
    | null
  const token = payload?.data?.token

  if (!response.ok || typeof token !== "string" || !token.trim()) {
    throw new Error("PRZELEWY24_REGISTRATION_FAILED")
  }

  return {
    token,
    redirectUrl:
      `${config.apiBaseUrl}/trnRequest/${encodeURIComponent(token)}`,
  }
}

export async function verifyPrzelewy24TransactionIdentity(
  config: Przelewy24Config,
  transaction: {
    sessionId: string
    orderId: Przelewy24OrderId
    amount: number
    currency: string
  }
) {
  const sign = calculatePrzelewy24Sign({
    sessionId: transaction.sessionId,
    orderId: transaction.orderId,
    amount: transaction.amount,
    currency: transaction.currency,
    crc: config.crc,
  })

  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/transaction/verify`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuth(config),
      },
      body: serializePrzelewy24Json({
        merchantId: config.merchantId,
        posId: config.posId,
        sessionId: transaction.sessionId,
        amount: transaction.amount,
        currency: transaction.currency,
        orderId: transaction.orderId,
        sign,
      }),
      signal: AbortSignal.timeout(10_000),
    }
  )

  const payload = (await response.json().catch(() => null)) as
    | { data?: { status?: unknown }; responseCode?: unknown }
    | null

  if (
    !response.ok ||
    payload?.data?.status !== "success" ||
    (payload.responseCode !== undefined && payload.responseCode !== 0)
  ) {
    throw new Error("PRZELEWY24_TRANSACTION_VERIFY_FAILED")
  }

  return true
}

export async function verifyPrzelewy24Transaction(
  config: Przelewy24Config,
  notification: Przelewy24Notification
) {
  if (!verifyPrzelewy24NotificationSignature(notification, config)) {
    throw new Error("PRZELEWY24_NOTIFICATION_SIGNATURE_INVALID")
  }

  return verifyPrzelewy24TransactionIdentity(config, {
    sessionId: notification.sessionId,
    orderId: notification.orderId,
    amount: notification.amount,
    currency: notification.currency,
  })
}

export async function getPrzelewy24TransactionBySessionId(
  config: Przelewy24Config,
  sessionId: string
): Promise<Przelewy24TransactionDetails | null> {
  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/transaction/by/sessionId/${encodeURIComponent(sessionId)}`,
    {
      headers: {
        Authorization: basicAuth(config),
      },
      signal: AbortSignal.timeout(10_000),
    }
  )

  if (response.status === 404) return null

  const payload = await response
    .text()
    .then((raw) => {
      try {
        return parsePrzelewy24Json(raw) as {
          data?: Record<string, unknown>
          responseCode?: unknown
        }
      } catch {
        return null
      }
    })
  const data = payload?.data

  if (
    !response.ok ||
    !data ||
    !normalizePrzelewy24OrderId(data.orderId) ||
    typeof data.sessionId !== "string" ||
    !Number.isSafeInteger(data.status) ||
    !Number.isSafeInteger(data.amount) ||
    typeof data.currency !== "string"
  ) {
    throw new Error("PRZELEWY24_TRANSACTION_DETAILS_INVALID")
  }

  return {
    orderId: normalizePrzelewy24OrderId(data.orderId)!,
    sessionId: data.sessionId,
    status: Number(data.status),
    amount: Number(data.amount),
    currency: data.currency,
    statement:
      typeof data.statement === "string" ? data.statement : undefined,
    paymentMethod:
      Number.isSafeInteger(data.paymentMethod)
        ? Number(data.paymentMethod)
        : undefined,
  }
}

export async function getPrzelewy24RefundDetails(
  config: Przelewy24Config,
  orderId: Przelewy24OrderId
): Promise<Przelewy24RefundDetails | null> {
  const normalizedOrderId = normalizePrzelewy24OrderId(orderId)
  if (!normalizedOrderId) {
    throw new Error("PRZELEWY24_ORDER_ID_INVALID")
  }

  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/refund/by/orderId/${normalizedOrderId}`,
    {
      headers: {
        Authorization: basicAuth(config),
      },
      signal: AbortSignal.timeout(10_000),
    }
  )

  if (response.status === 404) return null

  const payload = await response
    .text()
    .then((raw) => {
      try {
        return parsePrzelewy24Json(raw) as {
          data?: Record<string, unknown>
          responseCode?: unknown
        }
      } catch {
        return null
      }
    })
  const data = payload?.data
  const refunds =
    data && Array.isArray(data.refunds) ? data.refunds : null

  if (
    !response.ok ||
    !data ||
    !normalizePrzelewy24OrderId(data.orderId) ||
    typeof data.sessionId !== "string" ||
    !Number.isSafeInteger(data.amount) ||
    typeof data.currency !== "string" ||
    !refunds
  ) {
    throw new Error("PRZELEWY24_REFUND_DETAILS_INVALID")
  }

  const normalized = refunds.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).requestId !== "string" ||
      !Number.isSafeInteger((entry as Record<string, unknown>).status) ||
      !Number.isSafeInteger((entry as Record<string, unknown>).amount)
    ) {
      return []
    }
    const record = entry as Record<string, unknown>
    return [{
      batchId: Number.isSafeInteger(record.batchId)
        ? Number(record.batchId)
        : undefined,
      requestId: String(record.requestId),
      date: typeof record.date === "string" ? record.date : undefined,
      login: typeof record.login === "string" ? record.login : undefined,
      description:
        typeof record.description === "string"
          ? record.description
          : undefined,
      status: Number(record.status),
      amount: Number(record.amount),
    }]
  })

  return {
    orderId: normalizePrzelewy24OrderId(data.orderId)!,
    sessionId: data.sessionId,
    amount: Number(data.amount),
    currency: data.currency,
    refunds: normalized,
  }
}


export function validatePrzelewy24NotificationForOrder(
  order: Przelewy24StoredOrder,
  notification: Przelewy24Notification
) {
  if (
    order.paymentProvider !== "PRZELEWY24" ||
    order.p24SessionId !== notification.sessionId
  ) {
    throw new Error("PRZELEWY24_ORDER_MISMATCH")
  }

  if (
    notification.currency !== "PLN" ||
    notification.originAmount !== notification.amount ||
    notification.amount !==
      moneyToMinorUnits(Number(order.totalPriceFinal ?? 0))
  ) {
    throw new Error("PRZELEWY24_AMOUNT_MISMATCH")
  }

  if (
    order.p24OrderId !== undefined &&
    order.p24OrderId !== null &&
    !przelewy24OrderIdsEqual(order.p24OrderId, notification.orderId)
  ) {
    throw new Error("PRZELEWY24_ORDER_ID_MISMATCH")
  }

  return true
}

function validatePrzelewy24TransactionForOrder(
  order: Przelewy24StoredOrder,
  transaction: Przelewy24TransactionDetails
) {
  if (
    order.paymentProvider !== "PRZELEWY24" ||
    order.p24SessionId !== transaction.sessionId
  ) {
    throw new Error("PRZELEWY24_ORDER_MISMATCH")
  }
  if (
    transaction.currency !== "PLN" ||
    transaction.amount !==
      moneyToMinorUnits(Number(order.totalPriceFinal ?? 0))
  ) {
    throw new Error("PRZELEWY24_AMOUNT_MISMATCH")
  }
  if (
    order.p24OrderId !== undefined &&
    order.p24OrderId !== null &&
    !przelewy24OrderIdsEqual(order.p24OrderId, transaction.orderId)
  ) {
    throw new Error("PRZELEWY24_ORDER_ID_MISMATCH")
  }
}

export function recoverPrzelewy24CheckoutRegistration(
  order: Przelewy24StoredOrder,
  transaction: Przelewy24TransactionDetails,
  now = new Date().toISOString()
) {
  validatePrzelewy24TransactionForOrder(order, transaction)

  if (order.paymentCheckoutRegistrationStatus === "READY") {
    return "unchanged" as const
  }

  if (
    order.paymentCheckoutRegistrationStatus !== "PENDING" &&
    order.paymentCheckoutRegistrationStatus !== "UNCERTAIN"
  ) {
    throw new Error("PRZELEWY24_REGISTRATION_STATE_INVALID")
  }

  order.paymentCheckoutRegistrationStatus = "READY"
  order.p24OrderId = order.p24OrderId ?? transaction.orderId
  order.paymentReconciledAt = now
  return "ready" as const
}

export function applyReconciledPrzelewy24Payment(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  transaction: Przelewy24TransactionDetails,
  now = new Date().toISOString()
) {
  validatePrzelewy24TransactionForOrder(order, transaction)

  if (
    (order.paymentStatus === "PAID" ||
      order.paymentStatus === "REFUNDED") &&
    przelewy24OrderIdsEqual(order.p24OrderId, transaction.orderId)
  ) {
    order.paymentReconciledAt = now
    order.p24VerificationPending = null
    order.p24VerificationPendingAt = null
    return "unchanged" as const
  }

  if (
    order.inventoryReservationStatus !== "RESERVED" &&
    order.inventoryReservationStatus !== "FINALIZED"
  ) {
    throw new Error("PRZELEWY24_INVENTORY_NOT_RESERVED")
  }

  if (order.inventoryReservationStatus === "RESERVED") {
    order.inventoryReservationStatus = "FINALIZED"
    order.inventoryFinalizedAt = order.inventoryFinalizedAt ?? now
  }

  order.paymentStatus = "PAID"
  order.p24OrderId = transaction.orderId
  order.paymentUpdatedAt = now
  order.paymentReconciledAt = now
  order.paidAt = order.paidAt ?? now
  order.p24VerificationPending = null
  order.p24VerificationPendingAt = null

  void products
  return "paid" as const
}

export function applyReturnedPrzelewy24Payment(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  transaction: Przelewy24TransactionDetails,
  now = new Date().toISOString()
) {
  validatePrzelewy24TransactionForOrder(order, transaction)

  if (transaction.status !== 3) {
    throw new Error("PRZELEWY24_TRANSACTION_NOT_RETURNED")
  }

  if (
    order.paymentStatus === "REFUNDED" &&
    order.status === "CANCELLED" &&
    przelewy24OrderIdsEqual(order.p24OrderId, transaction.orderId)
  ) {
    order.paymentReconciledAt = now
    return "unchanged" as const
  }

  if (
    order.status === "SHIPPED" ||
    order.inventoryReservationStatus === "FINALIZED"
  ) {
    throw new Error("PRZELEWY24_RETURNED_PAYMENT_REQUIRES_REVIEW")
  }
  if (
    order.inventoryReservationStatus !== "RESERVED" &&
    order.inventoryReservationStatus !== "RELEASED"
  ) {
    throw new Error("PRZELEWY24_INVENTORY_NOT_RESERVED")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  if (order.inventoryReservationStatus === "RESERVED") {
    releaseInventory(products, order.items)
    order.inventoryReservationStatus = "RELEASED"
    order.inventoryReleasedAt = order.inventoryReleasedAt ?? now
  }

  order.paymentStatus = "REFUNDED"
  order.refundStatus = "succeeded"
  order.p24OrderId = transaction.orderId
  order.paymentUpdatedAt = now
  order.paymentReconciledAt = now
  order.refundedAt = order.refundedAt ?? now
  order.status = "CANCELLED"
  order.cancelledAt = order.cancelledAt ?? now
  order.p24VerificationPending = null
  order.p24VerificationPendingAt = null

  return "returned" as const
}

export function stagePrzelewy24Verification(
  order: Przelewy24StoredOrder,
  notification: Przelewy24Notification,
  now = new Date().toISOString()
) {
  validatePrzelewy24NotificationForOrder(order, notification)

  if (
    (order.paymentStatus === "PAID" ||
      order.paymentStatus === "REFUNDED") &&
    przelewy24OrderIdsEqual(order.p24OrderId, notification.orderId)
  ) {
    return "already-final" as const
  }

  const pending = order.p24VerificationPending
  if (
    pending &&
    (pending.sessionId !== notification.sessionId ||
      !przelewy24OrderIdsEqual(pending.orderId, notification.orderId) ||
      pending.amount !== notification.amount ||
      pending.currency !== notification.currency ||
      pending.sign !== notification.sign)
  ) {
    throw new Error("PRZELEWY24_PENDING_NOTIFICATION_MISMATCH")
  }

  order.p24VerificationPending = { ...notification }
  order.p24VerificationPendingAt =
    order.p24VerificationPendingAt ?? now
  return pending ? ("unchanged" as const) : ("staged" as const)
}

export function applyVerifiedPrzelewy24Payment(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  notification: Przelewy24Notification,
  now = new Date().toISOString()
) {
  validatePrzelewy24NotificationForOrder(order, notification)

  if (
    (order.paymentStatus === "PAID" ||
      order.paymentStatus === "REFUNDED") &&
    przelewy24OrderIdsEqual(order.p24OrderId, notification.orderId)
  ) {
    order.p24LastNotificationSign =
      order.p24LastNotificationSign ?? notification.sign
    order.p24VerificationPending = null
    order.p24VerificationPendingAt = null
    return "unchanged" as const
  }

  if (
    order.inventoryReservationStatus !== "RESERVED" &&
    order.inventoryReservationStatus !== "FINALIZED"
  ) {
    throw new Error("PRZELEWY24_INVENTORY_NOT_RESERVED")
  }

  // Stock is already decremented when checkout is registered. Successful
  // verification only makes that reservation final and must be replay-safe.
  if (order.inventoryReservationStatus === "RESERVED") {
    order.inventoryReservationStatus = "FINALIZED"
    order.inventoryFinalizedAt = order.inventoryFinalizedAt ?? now
  }

  order.paymentStatus = "PAID"
  order.p24OrderId = notification.orderId
  order.p24LastNotificationSign = notification.sign
  order.paymentUpdatedAt = now
  order.paymentReconciledAt = now
  order.paidAt = order.paidAt ?? now
  order.p24VerificationPending = null
  order.p24VerificationPendingAt = null

  void products
  return "paid" as const
}


export function verifyPrzelewy24RefundNotificationSignature(
  notification: Przelewy24RefundNotification,
  config: Przelewy24Config
) {
  if (notification.merchantId !== config.merchantId) {
    return false
  }

  const expected = calculatePrzelewy24Sign({
    orderId: notification.orderId,
    sessionId: notification.sessionId,
    refundsUuid: notification.refundsUuid,
    merchantId: notification.merchantId,
    amount: notification.amount,
    currency: notification.currency,
    status: notification.status,
    crc: config.crc,
  })

  return safeEqualHex(notification.sign, expected)
}

function refundAttemptIds(orderId: string, attempt: number) {
  const digest = createHash("sha256")
    .update(`${orderId}:przelewy24-refund:${attempt}`, "utf8")
    .digest("hex")

  return {
    requestId: `onics-${digest.slice(0, 32)}`,
    refundsUuid: digest.slice(0, 32),
  }
}

function assertPrzelewy24ReturnOrder(order: Przelewy24StoredOrder) {
  if (order.paymentProvider !== "PRZELEWY24") {
    throw new Error("PRZELEWY24_REQUIRED")
  }
}

export function requestPrzelewy24Return(
  order: Przelewy24StoredOrder,
  now = new Date().toISOString()
) {
  assertPrzelewy24ReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }
  if (order.status !== "SHIPPED") {
    throw new Error("PRZELEWY24_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("PRZELEWY24_RETURN_PAYMENT_REQUIRED")
  }

  if (order.returnStatus === "REQUESTED") return "requested" as const
  if (
    order.returnStatus === "RECEIVED" ||
    order.returnStatus === "REFUND_PENDING"
  ) {
    return "received" as const
  }
  if (order.returnStatus) {
    throw new Error("PRZELEWY24_RETURN_INVALID_STATE")
  }

  order.returnStatus = "REQUESTED"
  order.returnRequestedAt = order.returnRequestedAt ?? now
  order.returnUpdatedAt = now
  return "requested" as const
}

export function receivePrzelewy24Return(
  order: Przelewy24StoredOrder,
  now = new Date().toISOString()
) {
  assertPrzelewy24ReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }
  if (order.status !== "SHIPPED") {
    throw new Error("PRZELEWY24_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("PRZELEWY24_RETURN_PAYMENT_REQUIRED")
  }
  if (
    order.returnStatus === "RECEIVED" ||
    order.returnStatus === "REFUND_PENDING"
  ) {
    return "received" as const
  }
  if (order.returnStatus !== "REQUESTED") {
    throw new Error("PRZELEWY24_RETURN_NOT_REQUESTED")
  }

  order.returnStatus = "RECEIVED"
  order.returnReceivedAt = order.returnReceivedAt ?? now
  order.returnUpdatedAt = now
  return "received" as const
}

export function stagePrzelewy24Refund(
  order: Przelewy24StoredOrder,
  now = new Date().toISOString()
) {
  assertPrzelewy24ReturnOrder(order)

  if (
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED" &&
    order.paymentStatus === "REFUNDED"
  ) {
    return {
      outcome: "completed" as const,
      requestId: order.p24RefundRequestId ?? "",
      refundsUuid: order.p24RefundsUuid ?? "",
    }
  }
  if (order.status !== "SHIPPED") {
    throw new Error("PRZELEWY24_RETURN_INVALID_ORDER_STATUS")
  }
  if (order.paymentStatus !== "PAID") {
    throw new Error("PRZELEWY24_REFUND_REQUIRES_PAID")
  }
  if (!order.p24OrderId || !order.p24SessionId) {
    throw new Error("PRZELEWY24_REFUND_IDENTITY_MISSING")
  }
  if (order.returnStatus !== "RECEIVED" &&
      order.returnStatus !== "REFUND_PENDING") {
    throw new Error("PRZELEWY24_RETURN_NOT_RECEIVED")
  }

  if (
    order.refundStatus === "pending" &&
    order.p24RefundRequestId &&
    order.p24RefundsUuid
  ) {
    order.returnStatus = "REFUND_PENDING"
    return {
      outcome: "unchanged" as const,
      requestId: order.p24RefundRequestId,
      refundsUuid: order.p24RefundsUuid,
    }
  }

  const attempt =
    order.refundStatus === "failed"
      ? Math.max(1, Number(order.p24RefundAttempt ?? 1) + 1)
      : Math.max(1, Number(order.p24RefundAttempt ?? 1))
  const ids = refundAttemptIds(order.id, attempt)

  order.p24RefundAttempt = attempt
  order.p24RefundRequestId = ids.requestId
  order.p24RefundsUuid = ids.refundsUuid
  order.refundStatus = "pending"
  order.refundRequestedAt = now
  order.refundUpdatedAt = now
  order.returnStatus = "REFUND_PENDING"
  order.returnUpdatedAt = now

  return {
    outcome: "staged" as const,
    ...ids,
  }
}

export async function requestPrzelewy24Refund(
  config: Przelewy24Config,
  input: {
    orderId: Przelewy24OrderId
    sessionId: string
    amount: number
    requestId: string
    refundsUuid: string
    description?: string
  }
) {
  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/transaction/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuth(config),
      },
      body: serializePrzelewy24Json({
        requestId: input.requestId,
        refunds: [
          {
            orderId: input.orderId,
            sessionId: input.sessionId,
            amount: input.amount,
            ...(input.description
              ? { description: input.description.slice(0, 35) }
              : {}),
          },
        ],
        refundsUuid: input.refundsUuid,
        urlStatus: `${config.appUrl}/api/webhooks/przelewy24/refund`,
      }),
      signal: AbortSignal.timeout(10_000),
    }
  )

  const payload = await response
    .text()
    .then((raw) => {
      try {
        return parsePrzelewy24Json(raw)
      } catch {
        return null
      }
    })
  const serialized = JSON.stringify(payload ?? {})

  if (
    response.status === 400 &&
    serialized.includes("Request already exists")
  ) {
    return { accepted: true, duplicate: true } as const
  }

  if (!response.ok) {
    throw new Error("PRZELEWY24_REFUND_REQUEST_FAILED")
  }

  const data =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: Array<Record<string, unknown>> }).data
      : []

  const matching = data.find(
    (entry) =>
      przelewy24OrderIdsEqual(entry.orderId, input.orderId) &&
      String(entry.sessionId ?? "") === input.sessionId
  )

  if (matching && matching.status === false) {
    throw new Error("PRZELEWY24_REFUND_REJECTED")
  }

  return { accepted: true, duplicate: false } as const
}

export function validatePrzelewy24RefundNotificationForOrder(
  order: Przelewy24StoredOrder,
  notification: Przelewy24RefundNotification
) {
  assertPrzelewy24ReturnOrder(order)

  if (
    !przelewy24OrderIdsEqual(order.p24OrderId, notification.orderId) ||
    order.p24SessionId !== notification.sessionId ||
    order.p24RefundRequestId !== notification.requestId ||
    order.p24RefundsUuid !== notification.refundsUuid
  ) {
    throw new Error("PRZELEWY24_REFUND_ORDER_MISMATCH")
  }

  if (
    notification.currency !== "PLN" ||
    notification.amount !==
      moneyToMinorUnits(Number(order.totalPriceFinal ?? 0))
  ) {
    throw new Error("PRZELEWY24_REFUND_AMOUNT_MISMATCH")
  }

  return true
}

function applyPrzelewy24RefundOutcome(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  outcome: "completed" | "failed",
  now: string
) {
  if (
    order.paymentStatus === "REFUNDED" &&
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    return "completed" as const
  }

  order.refundUpdatedAt = now

  if (outcome === "failed") {
    order.refundStatus = "failed"
    order.returnStatus = "RECEIVED"
    order.returnUpdatedAt = now
    return "failed" as const
  }

  if (order.paymentStatus !== "PAID") {
    throw new Error("PRZELEWY24_REFUND_REQUIRES_PAID")
  }
  if (order.status !== "SHIPPED") {
    throw new Error("PRZELEWY24_RETURN_INVALID_ORDER_STATUS")
  }
  if (
    order.returnStatus !== "RECEIVED" &&
    order.returnStatus !== "REFUND_PENDING"
  ) {
    throw new Error("PRZELEWY24_RETURN_NOT_RECEIVED")
  }
  if (order.inventoryReservationStatus !== "FINALIZED") {
    throw new Error("PRZELEWY24_RETURN_INVENTORY_NOT_FINALIZED")
  }
  if (!order.items?.length) {
    throw new Error("INVENTORY_RESERVATION_MISSING_ITEMS")
  }

  if (!order.inventoryRefundRestockedAt) {
    releaseInventory(products, order.items)
    order.inventoryRefundRestockedAt = now
  }

  order.refundStatus = "succeeded"
  order.paymentStatus = "REFUNDED"
  order.refundedAt = order.refundedAt ?? now
  order.paymentUpdatedAt = now
  order.paymentReconciledAt = now
  order.status = "RETURNED"
  order.returnStatus = "COMPLETED"
  order.returnUpdatedAt = now
  order.returnCompletedAt = order.returnCompletedAt ?? now

  return "completed" as const
}

export function applyReconciledPrzelewy24Refund(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  details: Przelewy24RefundDetails,
  now = new Date().toISOString()
) {
  assertPrzelewy24ReturnOrder(order)

  if (
    order.paymentStatus === "REFUNDED" &&
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    order.paymentReconciledAt = now
    return "completed" as const
  }

  if (
    !order.p24OrderId ||
    !order.p24SessionId ||
    !order.p24RefundRequestId
  ) {
    throw new Error("PRZELEWY24_REFUND_IDENTITY_MISSING")
  }
  if (
    !przelewy24OrderIdsEqual(details.orderId, order.p24OrderId) ||
    details.sessionId !== order.p24SessionId ||
    details.currency !== "PLN"
  ) {
    throw new Error("PRZELEWY24_REFUND_DETAILS_MISMATCH")
  }

  const expectedAmount = moneyToMinorUnits(
    Number(order.totalPriceFinal ?? 0)
  )
  const matching = details.refunds.filter(
    (refund) =>
      refund.requestId === order.p24RefundRequestId &&
      refund.amount === expectedAmount
  )

  if (matching.length > 1) {
    throw new Error("PRZELEWY24_REFUND_DETAILS_AMBIGUOUS")
  }
  if (matching.length === 0) {
    return "missing" as const
  }

  const refund = matching[0]
  order.paymentReconciledAt = now

  // Refund details use provider status codes:
  // 1 completed, 2 in progress, 3 awaiting approval, 4 rejected.
  if (refund.status === 1) {
    return applyPrzelewy24RefundOutcome(
      products,
      order,
      "completed",
      now
    )
  }
  if (refund.status === 4) {
    return applyPrzelewy24RefundOutcome(products, order, "failed", now)
  }
  if (refund.status === 2 || refund.status === 3) {
    order.refundStatus = "pending"
    order.returnStatus = "REFUND_PENDING"
    order.refundUpdatedAt = now
    order.returnUpdatedAt = now
    return "pending" as const
  }

  throw new Error("PRZELEWY24_REFUND_STATUS_UNKNOWN")
}

export function applyPrzelewy24RefundNotification(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  notification: Przelewy24RefundNotification,
  now = new Date().toISOString()
) {
  validatePrzelewy24RefundNotificationForOrder(order, notification)

  if (
    order.paymentStatus === "REFUNDED" &&
    order.status === "RETURNED" &&
    order.returnStatus === "COMPLETED"
  ) {
    order.p24LastRefundNotificationSign =
      order.p24LastRefundNotificationSign ?? notification.sign
    return "completed" as const
  }

  order.p24LastRefundNotificationSign = notification.sign
  return applyPrzelewy24RefundOutcome(
    products,
    order,
    notification.status === 0 ? "completed" : "failed",
    now
  )
}
