import type {
  PaymentControlSettings,
  PaymentMethodSettings,
} from "@/store/serverStore"
import {
  getPaymentProviderDefinition,
  paymentProviderOperationalStatus,
  type PaymentProviderCapabilities,
  type PaymentProviderConfigurationIssue,
  type PaymentProviderId,
  type PaymentRuntimeOptions,
} from "@/lib/paymentProviders"

export {
  bankTransferOperationalStatus,
  przelewy24OperationalStatus,
  stripeOperationalStatus,
} from "@/lib/paymentProviders"

export type PaymentMethodId = PaymentProviderId

export type PaymentProviderState =
  | "ready"
  | "misconfigured"
  | "disabled"
  | "maintenance"

export type PaymentMethodAvailability = {
  id: PaymentMethodId
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  displayOrder: number
  maintenanceMessage: string | null
  kind: "REDIRECT" | "MANUAL"
  capabilities: PaymentProviderCapabilities
  state: PaymentProviderState
  configurationIssues: PaymentProviderConfigurationIssue[]
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

export function resolvePaymentProviderState(
  config: PaymentMethodSettings[PaymentMethodId],
  operational: ReturnType<typeof paymentProviderOperationalStatus>
): PaymentProviderState {
  if (!config.enabled) {
    return config.maintenanceMessage ? "maintenance" : "disabled"
  }
  if (!operational.configured) return "misconfigured"
  return "ready"
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
    const state = resolvePaymentProviderState(config, operational)

    return {
      id,
      name: config.displayName,
      enabled: config.enabled,
      configured: operational.configured,
      webhookConfigured: operational.webhookConfigured,
      displayOrder: config.displayOrder,
      maintenanceMessage: config.maintenanceMessage,
      kind: provider.kind,
      capabilities: { ...provider.capabilities },
      state,
      configurationIssues: [...operational.configurationIssues],
      available: state === "ready",
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
    state: control.enabled
      ? ("ready" as const)
      : control.maintenanceMessage
        ? ("maintenance" as const)
        : ("disabled" as const),
    maintenanceMessage: control.maintenanceMessage,
    updatedAt: control.updatedAt,
  }
}
