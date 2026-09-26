import { createHash, timingSafeEqual } from "node:crypto"
import { moneyToMinorUnits } from "@/lib/payments"
import type {
  InventoryProduct,
  InventoryReservationOrder,
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
  orderId: number
  methodId: number
  statement: string
  sign: string
}

export type Przelewy24StoredOrder = InventoryReservationOrder & {
  id: string
  paymentProvider?: unknown
  totalPriceFinal?: number | null
  paymentStatus?: string | null
  p24SessionId?: string | null
  p24OrderId?: number | null
  p24LastNotificationSign?: string | null
  paidAt?: string | null
  paymentUpdatedAt?: string | null
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
    .update(JSON.stringify(payload), "utf8")
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

export async function verifyPrzelewy24Transaction(
  config: Przelewy24Config,
  notification: Przelewy24Notification
) {
  if (!verifyPrzelewy24NotificationSignature(notification, config)) {
    throw new Error("PRZELEWY24_NOTIFICATION_SIGNATURE_INVALID")
  }

  const sign = calculatePrzelewy24Sign({
    sessionId: notification.sessionId,
    orderId: notification.orderId,
    amount: notification.amount,
    currency: notification.currency,
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
      body: JSON.stringify({
        merchantId: config.merchantId,
        posId: config.posId,
        sessionId: notification.sessionId,
        amount: notification.amount,
        currency: notification.currency,
        orderId: notification.orderId,
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
    notification.amount !==
      moneyToMinorUnits(Number(order.totalPriceFinal ?? 0))
  ) {
    throw new Error("PRZELEWY24_AMOUNT_MISMATCH")
  }

  if (
    order.p24OrderId !== undefined &&
    order.p24OrderId !== null &&
    order.p24OrderId !== notification.orderId
  ) {
    throw new Error("PRZELEWY24_ORDER_ID_MISMATCH")
  }

  return true
}

export function applyVerifiedPrzelewy24Payment(
  products: InventoryProduct[],
  order: Przelewy24StoredOrder,
  notification: Przelewy24Notification,
  now = new Date().toISOString()
) {
  validatePrzelewy24NotificationForOrder(order, notification)

  if (
    order.paymentStatus === "PAID" &&
    order.p24OrderId === notification.orderId
  ) {
    order.p24LastNotificationSign =
      order.p24LastNotificationSign ?? notification.sign
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
  order.paidAt = order.paidAt ?? now

  void products
  return "paid" as const
}
