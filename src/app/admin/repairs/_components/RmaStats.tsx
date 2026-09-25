"use client"

import { Activity, CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import type { AdminRma } from "../RepairsDashboardClient"

const completedStatuses = new Set(["COMPLETED", "DONE", "RETURNED"])
const serviceStatuses = new Set(["DIAGNOSIS", "REPAIRING", "W NAPRAWIE"])
const pendingStatuses = new Set(["PENDING", "WERYFIKACJA", "INQUIRY"])

export function RmaStats({ rmas }: { rmas: AdminRma[] }) {
  const pending = rmas.filter((rma) => pendingStatuses.has(rma.status)).length
  const inProgress = rmas.filter((rma) => serviceStatuses.has(rma.status)).length
  const completed = rmas.filter((rma) => completedStatuses.has(rma.status)).length

  const stats = [
    { label: "W kolejce", value: pending, icon: Clock },
    { label: "W serwisie", value: inProgress, icon: Activity },
    { label: "Zakończone", value: completed, icon: CheckCircle2 },
    { label: "Wszystkie", value: rmas.length, icon: ShieldAlert },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <stat.icon className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </span>
          </div>
          <strong className="mt-4 block text-4xl">{stat.value}</strong>
        </div>
      ))}
    </div>
  )
}
