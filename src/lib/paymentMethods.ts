import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"
import {
  getPaymentProviderDefinition,
  paymentProviderOperationalStatus,
  type PaymentProviderId,
  type PaymentRuntimeOptions,
} from "@/lib/paymentProviders"

export {
  bankTransferOperationalStatus,
  stripeOperationalStatus,
} from "@/lib/paymentProviders"

export type PaymentMethodId = PaymentProviderId

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

export function paymentMethodOperationalStatus(
  method: PaymentMethodId,
  options: PaymentRuntimeOptions = {}
) {
  return paymentProviderOperationalStatus(method, options)
}

export function describePaymentMethods(
  settings: PaymentMethodSettings,
  options: PaymentRuntimeOptions = {}
): PaymentMethodAvailability[] {
  const methods: PaymentMethodAvailability[] = (
    Object.keys(settings) as PaymentMethodId[]
  ).map((id) => {
    const provider = getPaymentProviderDefinition(id)
    const operational = provider.operationalStatus(options)
    const config = settings[id]

    return {
      id,
      name: config.displayName,
      enabled: config.enabled,
      configured: operational.configured,
      webhookConfigured: operational.webhookConfigured,
      displayOrder: config.displayOrder,
      maintenanceMessage: config.maintenanceMessage,
      kind: provider.kind,
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
