export type CheckoutPaymentSnapshot = {
  orderId?: string | null
  sessionId: string
  amountTotal: number | null
  currency: string | null
  paymentStatus: string | null
}

export type CheckoutPaymentOrder = {
  id: string
  totalPriceFinal: number
  stripeCheckoutSessionId?: string | null
  paymentStatus?: string | null
}

export type PaymentVerificationResult =
  | { ok: true }
  | { ok: false; reason: string }

type StripeRuntimeOptions = {
  nodeEnv?: string
  stripeSecretKey?: string | null
  stripeWebhookSecret?: string | null
  appUrl?: string | null
  requestUrl?: string | null
}

function cleanSecret(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized || null
}

function resolveCheckoutBaseUrl(options: StripeRuntimeOptions) {
  const configured = cleanSecret(options.appUrl)

  if (!configured) {
    if (options.nodeEnv === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL jest wymagane dla płatności Stripe w produkcji."
      )
    }
    if (!options.requestUrl) {
      throw new Error("Nie można ustalić adresu aplikacji dla Stripe.")
    }
    return new URL(options.requestUrl).origin
  }

  const parsed = new URL(configured)
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_APP_URL musi używać protokołu HTTP lub HTTPS.")
  }
  if (options.nodeEnv === "production" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL musi używać HTTPS w produkcji.")
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL musi wskazywać wyłącznie origin aplikacji.")
  }

  return parsed.origin
}

export function resolveStripeCheckoutConfig(
  options: StripeRuntimeOptions = {}
) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const stripeSecretKey = cleanSecret(
    options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY
  )
  const stripeWebhookSecret = cleanSecret(
    options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET
  )

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY jest wymagane dla płatności online.")
  }
  if (nodeEnv === "production" && !stripeWebhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET jest wymagane dla płatności Stripe w produkcji."
    )
  }

  return {
    stripeSecretKey,
    appUrl: resolveCheckoutBaseUrl({
      ...options,
      nodeEnv,
    }),
  }
}

export function validateOptionalStripeReadiness(
  options: StripeRuntimeOptions = {}
) {
  const stripeSecretKey = cleanSecret(
    options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY
  )
  const stripeWebhookSecret = cleanSecret(
    options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET
  )

  if (!stripeSecretKey && !stripeWebhookSecret) return

  resolveStripeCheckoutConfig({
    ...options,
    stripeSecretKey,
    stripeWebhookSecret,
  })
}

export function moneyToMinorUnits(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Nieprawidłowa wartość płatności.")
  }

  return Math.round((value + Number.EPSILON) * 100)
}

export function verifyCheckoutPayment(
  order: CheckoutPaymentOrder,
  snapshot: CheckoutPaymentSnapshot
): PaymentVerificationResult {
  if (snapshot.orderId && snapshot.orderId !== order.id) {
    return { ok: false, reason: "Stripe order_id nie pasuje do zamówienia." }
  }

  if (
    order.stripeCheckoutSessionId &&
    snapshot.sessionId !== order.stripeCheckoutSessionId
  ) {
    return { ok: false, reason: "Sesja Stripe nie pasuje do zamówienia." }
  }

  if ((snapshot.currency || "").toLowerCase() !== "pln") {
    return { ok: false, reason: "Nieprawidłowa waluta płatności Stripe." }
  }

  if (snapshot.amountTotal !== moneyToMinorUnits(order.totalPriceFinal)) {
    return { ok: false, reason: "Kwota Stripe nie pasuje do wartości zamówienia." }
  }

  return { ok: true }
}

export function nextPaymentStatus(
  currentStatus: string | null | undefined,
  incomingStatus: "PAID" | "FAILED" | "EXPIRED"
) {
  if (currentStatus === "PAID") return "PAID"
  return incomingStatus
}
