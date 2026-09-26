import type { PaymentAuditEntry } from "@/store/serverStore"

export type PaymentAuditActor = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export type PaymentAuditChange = {
  target: "GLOBAL" | "STRIPE"
  previousEnabled: boolean
  nextEnabled: boolean
  previousMaintenanceMessage?: string | null
  nextMaintenanceMessage?: string | null
}

export function paymentAuditChanged(change: PaymentAuditChange) {
  return (
    change.previousEnabled !== change.nextEnabled ||
    (change.previousMaintenanceMessage ?? null) !==
      (change.nextMaintenanceMessage ?? null)
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
  }

  entries.unshift(entry)
  if (entries.length > 100) {
    entries.splice(100)
  }

  return entry
}
