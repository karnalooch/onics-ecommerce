"use client"

import type { AdminRma } from "../RepairsDashboardClient"

const completedStatuses = new Set(["COMPLETED", "DONE", "RETURNED"])
const serviceStatuses = new Set(["DIAGNOSIS", "REPAIRING", "W NAPRAWIE"])
const pendingStatuses = new Set(["PENDING", "WERYFIKACJA", "INQUIRY"])

export function RmaStats({ rmas }: { rmas: AdminRma[] }) {
  const pending = rmas.filter((rma) => pendingStatuses.has(rma.status)).length
  const inProgress = rmas.filter((rma) => serviceStatuses.has(rma.status)).length
  const completed = rmas.filter((rma) => completedStatuses.has(rma.status)).length

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
        W kolejce <strong className="ml-2 font-mono">{pending}</strong>
      </span>
      <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
        W serwisie <strong className="ml-2 font-mono">{inProgress}</strong>
      </span>
      <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
        Zakończone <strong className="ml-2 font-mono">{completed}</strong>
      </span>
      <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
        Wszystkie <strong className="ml-2 font-mono">{rmas.length}</strong>
      </span>
    </div>
  )
}
