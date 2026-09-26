export const PAYMENT_PROVIDER_IDS = ["STRIPE", "BANK_TRANSFER", "PRZELEWY24"] as const

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
  p24MerchantId?: string | null
  p24PosId?: string | null
  p24ApiKey?: string | null
  p24Crc?: string | null
}

export const PAYMENT_PROVIDER_CONFIGURATION_ISSUES = [
  "CREDENTIALS_MISSING",
  "WEBHOOK_SECRET_MISSING",
  "PUBLIC_APP_URL_INVALID",
  "RECIPIENT_MISSING",
  "ACCOUNT_NUMBER_INVALID",
  "PROVIDER_NOT_PRODUCTION_READY",
] as const

export type PaymentProviderConfigurationIssue =
  (typeof PAYMENT_PROVIDER_CONFIGURATION_ISSUES)[number]

export type PaymentProviderOperationalStatus = {
  configured: boolean
  webhookConfigured: boolean
  configurationIssues: PaymentProviderConfigurationIssue[]
}

export type PaymentProviderDefinition = {
  id: PaymentProviderId
  kind: PaymentProviderKind
  settingsDefaults: {
    enabled: boolean
    displayName: string
    displayOrder: number
  }
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

export type PaymentProviderLifecycleDescriptor = {
  provider: PaymentProviderId
  kind: PaymentProviderKind
  capabilities: PaymentProviderCapabilities
  inferredFromLegacyFields: boolean
}

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
  const configurationIssues: PaymentProviderConfigurationIssue[] = []

  if (!hasSecretKey) {
    configurationIssues.push("CREDENTIALS_MISSING")
  }

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

  if (nodeEnv === "production") {
    if (!hasWebhookSecret) {
      configurationIssues.push("WEBHOOK_SECRET_MISSING")
    }
    if (!productionAppUrlConfigured) {
      configurationIssues.push("PUBLIC_APP_URL_INVALID")
    }
  }

  return {
    configured: configurationIssues.length === 0,
    webhookConfigured: hasWebhookSecret,
    configurationIssues,
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
  const configurationIssues: PaymentProviderConfigurationIssue[] = []

  if (!recipient?.trim()) {
    configurationIssues.push("RECIPIENT_MISSING")
  }
  if (!normalizedAccount || !/^\d{26}$/.test(normalizedAccount)) {
    configurationIssues.push("ACCOUNT_NUMBER_INVALID")
  }

  return {
    configured: configurationIssues.length === 0,
    webhookConfigured: false,
    configurationIssues,
  }
}

export function przelewy24OperationalStatus(
  options: PaymentRuntimeOptions = {}
): PaymentProviderOperationalStatus {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const merchantId = options.p24MerchantId ?? process.env.P24_MERCHANT_ID
  const posId = options.p24PosId ?? process.env.P24_POS_ID
  const apiKey = options.p24ApiKey ?? process.env.P24_API_KEY
  const crc = options.p24Crc ?? process.env.P24_CRC
  const configurationIssues: PaymentProviderConfigurationIssue[] = []

  const validNumericCredential = (value: string | null | undefined) => {
    if (!value?.trim() || !/^\d+$/.test(value.trim())) return false
    const parsed = Number(value.trim())
    return Number.isSafeInteger(parsed) && parsed > 0
  }

  if (
    !validNumericCredential(merchantId) ||
    !validNumericCredential(posId) ||
    !apiKey?.trim() ||
    !crc?.trim()
  ) {
    configurationIssues.push("CREDENTIALS_MISSING")
  }

  // #57 is intentionally sandbox-only. Production stays fail-closed until
  // notification verification and the full lifecycle are implemented.
  if (nodeEnv === "production") {
    configurationIssues.push("PROVIDER_NOT_PRODUCTION_READY")
  }

  return {
    configured: configurationIssues.length === 0,
    webhookConfigured: false,
    configurationIssues,
  }
}

const paymentProviderRegistry = {
  STRIPE: {
    id: "STRIPE",
    kind: "REDIRECT",
    settingsDefaults: {
      enabled: true,
      displayName: "Stripe",
      displayOrder: 10,
    },
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
    settingsDefaults: {
      enabled: false,
      displayName: "Przelew bankowy",
      displayOrder: 20,
    },
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
  PRZELEWY24: {
    id: "PRZELEWY24",
    kind: "REDIRECT",
    settingsDefaults: {
      enabled: false,
      displayName: "Przelewy24",
      displayOrder: 30,
    },
    capabilities: {
      checkout: true,
      webhook: false,
      cancel: false,
      refund: false,
      reconcile: false,
      rma: false,
      manualSettlement: false,
    },
    disabledMessage: "Przelewy24 jest obecnie niedostępne.",
    misconfiguredMessage:
      "Przelewy24 nie jest skonfigurowane lub provider jest dostępny tylko w sandboxie.",
    operationalStatus: przelewy24OperationalStatus,
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
  if (order.paymentProvider !== undefined && order.paymentProvider !== null) {
    return isPaymentProviderId(order.paymentProvider)
      ? order.paymentProvider
      : null
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

export function describeOrderPaymentLifecycle(
  order: PaymentProviderOrderIdentity
): PaymentProviderLifecycleDescriptor | null {
  const provider = resolveOrderPaymentProvider(order)
  if (!provider) return null

  const definition = getPaymentProviderDefinition(provider)
  return {
    provider,
    kind: definition.kind,
    capabilities: { ...definition.capabilities },
    inferredFromLegacyFields: !isPaymentProviderId(order.paymentProvider),
  }
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
