import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"

export type PaymentMethodId = keyof PaymentMethodSettings

export type PaymentMethodAvailability = {
  id: PaymentMethodId
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  displayOrder: number
  maintenanceMessage: string | null
  kind: "REDIRECT" | "MANUAL"
  available: boolean
  updatedAt: string | null
}

type PaymentRuntimeOptions = {
  nodeEnv?: string
  stripeSecretKey?: string | null
  stripeWebhookSecret?: string | null
  appUrl?: string | null
  bankTransferRecipient?: string | null
  bankTransferAccountNumber?: string | null
}

export function isPaymentControlEnabled(
  control: PaymentControlSettings
) {
  return control.enabled
}

export function isPaymentMethodEnabled(
  settings: PaymentMethodSettings,
  method: PaymentMethodId
) {
  return settings[method].enabled
}

export function resolvePaymentAvailability(
  control: PaymentControlSettings,
  settings: PaymentMethodSettings,
  method: PaymentMethodId
) {
  return control.enabled && settings[method].enabled
}

export function stripeOperationalStatus(
  options: PaymentRuntimeOptions = {}
) {
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
) {
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

export function paymentMethodOperationalStatus(
  method: PaymentMethodId,
  options: PaymentRuntimeOptions = {}
) {
  return method === "STRIPE"
    ? stripeOperationalStatus(options)
    : bankTransferOperationalStatus(options)
}

export function describePaymentMethods(
  settings: PaymentMethodSettings,
  options: PaymentRuntimeOptions = {}
): PaymentMethodAvailability[] {
  const methods: PaymentMethodAvailability[] = (
    Object.keys(settings) as PaymentMethodId[]
  ).map((id) => {
    const operational = paymentMethodOperationalStatus(id, options)
    const config = settings[id]

    return {
      id,
      name: config.displayName,
      enabled: config.enabled,
      configured: operational.configured,
      webhookConfigured: operational.webhookConfigured,
      displayOrder: config.displayOrder,
      maintenanceMessage: config.maintenanceMessage,
      kind: id === "STRIPE" ? "REDIRECT" : "MANUAL",
      available: config.enabled && operational.configured,
      updatedAt: config.updatedAt,
    }
  })

  return methods.sort(
    (left, right) =>
      left.displayOrder - right.displayOrder ||
      left.id.localeCompare(right.id)
  )
}

export function describePaymentControl(control: PaymentControlSettings) {
  return {
    enabled: control.enabled,
    maintenanceMessage: control.maintenanceMessage,
    updatedAt: control.updatedAt,
  }
}
