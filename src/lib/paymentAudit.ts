import type { PaymentAuditEntry } from "@/store/serverStore"

export type PaymentAuditActor = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export type PaymentAuditChange = {
  target: PaymentAuditEntry["target"]
  operation?: "SETTING_CHANGE" | "EMERGENCY_SHUTDOWN"
  previousEnabled: boolean
  nextEnabled: boolean
  previousMaintenanceMessage?: string | null
  nextMaintenanceMessage?: string | null
  previousDisplayName?: string | null
  nextDisplayName?: string | null
  previousDisplayOrder?: number | null
  nextDisplayOrder?: number | null
}

export function paymentAuditChanged(change: PaymentAuditChange) {
  return (
    change.operation === "EMERGENCY_SHUTDOWN" ||
    change.previousEnabled !== change.nextEnabled ||
    (change.previousMaintenanceMessage ?? null) !==
      (change.nextMaintenanceMessage ?? null) ||
    (change.previousDisplayName ?? null) !==
      (change.nextDisplayName ?? null) ||
    (change.previousDisplayOrder ?? null) !==
      (change.nextDisplayOrder ?? null)
  )
}

export function appendPaymentAudit(
  entries: PaymentAuditEntry[],
  actor: PaymentAuditActor,
  change: PaymentAuditChange,
  now = new Date().toISOString()
) {
  if (!paymentAuditChanged(change)) return null

  const entry: PaymentAuditEntry = {
    id: crypto.randomUUID(),
    createdAt: now,
    target: change.target,
    operation: change.operation ?? "SETTING_CHANGE",
    actor: {
      id: actor.id ? String(actor.id) : null,
      email: actor.email ?? null,
      name: actor.name ?? null,
    },
    previousEnabled: change.previousEnabled,
    nextEnabled: change.nextEnabled,
    previousMaintenanceMessage:
      change.previousMaintenanceMessage ?? null,
    nextMaintenanceMessage:
      change.nextMaintenanceMessage ?? null,
    previousDisplayName: change.previousDisplayName ?? null,
    nextDisplayName: change.nextDisplayName ?? null,
    previousDisplayOrder: change.previousDisplayOrder ?? null,
    nextDisplayOrder: change.nextDisplayOrder ?? null,
  }

  entries.unshift(entry)
  if (entries.length > 100) {
    entries.splice(100)
  }

  return entry
}
