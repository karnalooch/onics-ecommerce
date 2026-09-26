import type { PaymentMethodSettings } from "@/store/serverStore"

export type PaymentMethodId = "STRIPE"

export type PaymentMethodAvailability = {
  id: PaymentMethodId
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  updatedAt: string | null
}

export function isPaymentMethodEnabled(
  settings: PaymentMethodSettings,
  method: PaymentMethodId
) {
  return settings[method].enabled
}

export function stripeOperationalStatus(
  options: {
    nodeEnv?: string
    stripeSecretKey?: string | null
    stripeWebhookSecret?: string | null
  } = {}
) {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  const stripeSecretKey =
    options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret =
    options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET

  const hasSecretKey = Boolean(stripeSecretKey?.trim())
  const hasWebhookSecret = Boolean(stripeWebhookSecret?.trim())

  return {
    configured:
      hasSecretKey && (nodeEnv !== "production" || hasWebhookSecret),
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
