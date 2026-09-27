import { createHash } from "node:crypto"

type PaymentControlState = {
  enabled?: boolean
  maintenanceMessage?: string | null
  updatedAt?: string | null
}

type PaymentMethodState = {
  enabled?: boolean
  displayName?: string
  displayOrder?: number
  maintenanceMessage?: string | null
  updatedAt?: string | null
}

type GlobalPaymentSettingsUpdate = {
  enabled: boolean
  maintenanceMessage?: string | null
}

type MethodPaymentSettingsUpdate = {
  enabled?: boolean
  displayName?: string
  displayOrder?: number
  maintenanceMessage?: string | null
}

function stableToken(value: unknown) {
  const canonicalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonicalize)
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.entries(entry as Record<string, unknown>)
          .filter(([, child]) => child !== undefined)
          .sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          )
          .map(([key, child]) => [key, canonicalize(child)])
      )
    }
    return entry
  }

  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")
}

export function buildPaymentControlStateToken(
  control: PaymentControlState
) {
  return stableToken(control)
}

export function buildPaymentMethodStateToken(
  method: PaymentMethodState
) {
  return stableToken(method)
}

export function isGlobalPaymentSettingsReplay(
  current: PaymentControlState,
  requested: GlobalPaymentSettingsUpdate
) {
  const nextMaintenanceMessage =
    requested.maintenanceMessage?.trim() || null

  return (
    Boolean(current.enabled) === requested.enabled &&
    (current.maintenanceMessage ?? null) === nextMaintenanceMessage
  )
}

export function isMethodPaymentSettingsReplay(
  current: PaymentMethodState,
  requested: MethodPaymentSettingsUpdate
) {
  const nextEnabled = requested.enabled ?? Boolean(current.enabled)
  const nextDisplayName =
    requested.displayName?.trim() || current.displayName || ""
  const nextDisplayOrder =
    requested.displayOrder ?? Number(current.displayOrder ?? 0)
  const nextMaintenanceMessage =
    requested.maintenanceMessage === undefined
      ? current.maintenanceMessage ?? null
      : requested.maintenanceMessage?.trim() || null

  return (
    Boolean(current.enabled) === nextEnabled &&
    (current.displayName || "") === nextDisplayName &&
    Number(current.displayOrder ?? 0) === nextDisplayOrder &&
    (current.maintenanceMessage ?? null) === nextMaintenanceMessage
  )
}
