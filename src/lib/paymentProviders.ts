import type { PaymentMethodSettings } from "@/store/serverStore"

export const PAYMENT_PROVIDER_IDS = ["STRIPE", "BANK_TRANSFER"] as const

export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number]
export type PaymentProviderKind = "REDIRECT" | "MANUAL"

export const PAYMENT_PROVIDER_CAPABILITIES = [
  "checkout",
  "webhook",
  "cancel",
  "refund",
  "reconcile",
  "rma",
  "manualSettlement",
] as const

export type PaymentProviderCapability =
  (typeof PAYMENT_PROVIDER_CAPABILITIES)[number]

export type PaymentProviderCapabilities = Record<
  PaymentProviderCapability,
  boolean
>

export type PaymentRuntimeOptions = {
  nodeEnv?: string
  stripeSecretKey?: string | null
  stripeWebhookSecret?: string | null
  appUrl?: string | null
  bankTransferRecipient?: string | null
  bankTransferAccountNumber?: string | null
}

export type PaymentProviderOperationalStatus = {
  configured: boolean
  webhookConfigured: boolean
}

export type PaymentProviderDefinition = {
  id: PaymentProviderId
  kind: PaymentProviderKind
  capabilities: PaymentProviderCapabilities
  disabledMessage: string
  misconfiguredMessage: string
  operationalStatus: (
    options?: PaymentRuntimeOptions
  ) => PaymentProviderOperationalStatus
}

export type PaymentProviderOrderIdentity = {
  paymentProvider?: unknown
  stripeCheckoutSessionId?: unknown
  bankTransferReference?: unknown
  bankTransferIban?: unknown
  bankTransferAccountNumber?: unknown
}

type StoredPaymentProviderId = keyof PaymentMethodSettings

const providerIdsMatchStore: Record<StoredPaymentProviderId, true> = {
  STRIPE: true,
  BANK_TRANSFER: true,
}

void providerIdsMatchStore

export function stripeOperationalStatus(
  options: PaymentRuntimeOptions = {}
): PaymentProviderOperationalStatus {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const stripeSecretKey =
    options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret =
    options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET
  const appUrl = options.appUrl ?? process.env.NEXT_PUBLIC_APP_URL

  const hasSecretKey = Boolean(stripeSecretKey?.trim())
  const hasWebhookSecret = Boolean(stripeWebhookSecret?.trim())

  let productionAppUrlConfigured = nodeEnv !== "production"
  if (nodeEnv === "production" && appUrl?.trim()) {
    try {
      const parsed = new URL(appUrl.trim())
      productionAppUrlConfigured =
        parsed.protocol === "https:" &&
        !parsed.username &&
        !parsed.password &&
        parsed.pathname === "/" &&
        !parsed.search &&
        !parsed.hash
    } catch {
      productionAppUrlConfigured = false
    }
  }

  return {
    configured:
      hasSecretKey &&
      (nodeEnv !== "production" ||
        (hasWebhookSecret && productionAppUrlConfigured)),
    webhookConfigured: hasWebhookSecret,
  }
}

export function bankTransferOperationalStatus(
  options: PaymentRuntimeOptions = {}
): PaymentProviderOperationalStatus {
  const recipient =
    options.bankTransferRecipient ?? process.env.BANK_TRANSFER_RECIPIENT
  const accountNumber =
    options.bankTransferAccountNumber ??
    process.env.BANK_TRANSFER_ACCOUNT_NUMBER

  const normalizedAccount = accountNumber
    ?.replace(/^PL/i, "")
    .replace(/\s+/g, "")

  return {
    configured:
      Boolean(recipient?.trim()) &&
      Boolean(normalizedAccount && /^\d{26}$/.test(normalizedAccount)),
    webhookConfigured: false,
  }
}

const paymentProviderRegistry = {
  STRIPE: {
    id: "STRIPE",
    kind: "REDIRECT",
    capabilities: {
      checkout: true,
      webhook: true,
      cancel: true,
      refund: true,
      reconcile: true,
      rma: true,
      manualSettlement: false,
    },
    disabledMessage: "Płatność Stripe została wyłączona przez administratora.",
    misconfiguredMessage: "Płatności online nie są skonfigurowane.",
    operationalStatus: stripeOperationalStatus,
  },
  BANK_TRANSFER: {
    id: "BANK_TRANSFER",
    kind: "MANUAL",
    capabilities: {
      checkout: true,
      webhook: false,
      cancel: true,
      refund: true,
      reconcile: false,
      rma: true,
      manualSettlement: true,
    },
    disabledMessage: "Przelew bankowy jest obecnie niedostępny.",
    misconfiguredMessage: "Przelew bankowy nie jest poprawnie skonfigurowany.",
    operationalStatus: bankTransferOperationalStatus,
  },
} satisfies Record<PaymentProviderId, PaymentProviderDefinition>

export function getPaymentProviderDefinition(
  id: PaymentProviderId
): PaymentProviderDefinition {
  return paymentProviderRegistry[id]
}

export function paymentProviderOperationalStatus(
  id: PaymentProviderId,
  options: PaymentRuntimeOptions = {}
) {
  return getPaymentProviderDefinition(id).operationalStatus(options)
}

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return (
    typeof value === "string" &&
    (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value)
  )
}

export function resolveOrderPaymentProvider(
  order: PaymentProviderOrderIdentity
): PaymentProviderId | null {
  if (isPaymentProviderId(order.paymentProvider)) {
    return order.paymentProvider
  }

  if (
    typeof order.stripeCheckoutSessionId === "string" &&
    order.stripeCheckoutSessionId.trim()
  ) {
    return "STRIPE"
  }

  if (
    (typeof order.bankTransferReference === "string" &&
      order.bankTransferReference.trim()) ||
    (typeof order.bankTransferIban === "string" &&
      order.bankTransferIban.trim()) ||
    (typeof order.bankTransferAccountNumber === "string" &&
      order.bankTransferAccountNumber.trim())
  ) {
    return "BANK_TRANSFER"
  }

  return null
}

export function supportsPaymentProviderCapability(
  id: PaymentProviderId,
  capability: PaymentProviderCapability
) {
  return getPaymentProviderDefinition(id).capabilities[capability]
}

export function assertPaymentProviderCapability(
  id: PaymentProviderId,
  capability: PaymentProviderCapability
) {
  if (!supportsPaymentProviderCapability(id, capability)) {
    throw new Error("PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED")
  }
}

export function listPaymentProviderDefinitions() {
  return PAYMENT_PROVIDER_IDS.map((id) => getPaymentProviderDefinition(id))
}
