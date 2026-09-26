import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"

export type PaymentMethodId = "STRIPE"

export type PaymentMethodAvailability = {
  id: PaymentMethodId
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  updatedAt: string | null
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
  options: {
    nodeEnv?: string
    stripeSecretKey?: string | null
    stripeWebhookSecret?: string | null
    appUrl?: string | null
  } = {}
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

export function describePaymentMethods(
  settings: PaymentMethodSettings,
  options?: Parameters<typeof stripeOperationalStatus>[0]
): PaymentMethodAvailability[] {
  const stripe = stripeOperationalStatus(options)

  return [
    {
      id: "STRIPE",
      name: "Stripe",
      enabled: settings.STRIPE.enabled,
      configured: stripe.configured,
      webhookConfigured: stripe.webhookConfigured,
      updatedAt: settings.STRIPE.updatedAt,
    },
  ]
}


export function describePaymentControl(control: PaymentControlSettings) {
  return {
    enabled: control.enabled,
    maintenanceMessage: control.maintenanceMessage,
    updatedAt: control.updatedAt,
  }
}
