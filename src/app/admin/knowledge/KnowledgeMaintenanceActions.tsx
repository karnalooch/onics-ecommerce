"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

type Report = {
  ok: boolean
  manualInterventionRequired: boolean
  danglingReferences: string[]
  freshOrphans: string[]
  staleOrphans: string[]
  ambiguousLegacyFiles: string[]
  unsupportedFiles: string[]
}

export function KnowledgeMaintenanceActions({
  initialReport,
}: {
  initialReport: Report
}) {
  const [report, setReport] = useState(initialReport)
  const [running, setRunning] = useState<"audit" | "reconcile" | null>(null)
  const [message, setMessage] = useState("")

  const execute = async (mode: "audit" | "reconcile") => {
    setRunning(mode)
    setMessage("")

    try {
      const response = await fetch("/api/knowledge/sources/audit", {
        method: mode === "audit" ? "GET" : "POST",
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || "Operacja nie powiodła się.")
      }

      const nextReport = mode === "audit" ? payload : payload.report
      setReport(nextReport)
      setMessage(
        mode === "audit"
          ? "Audyt odświeżony."
          : "Reconcile zakończony. Usunięto: " +
              String(payload.removed?.length || 0) +
              "."
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Operacja nie powiodła się."
      )
    } finally {
      setRunning(null)
    }
  }

  const issueCount =
    report.danglingReferences.length +
    report.staleOrphans.length +
    report.ambiguousLegacyFiles.length +
    report.unsupportedFiles.length

  return (
    <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-sm font-semibold">
            {report.ok ? "Storage spójny" : "Wykryte problemy: " + String(issueCount)}
          </div>
          <div className="mt-1 text-sm text-[var(--ops-muted)]">
            Reconcile usuwa wyłącznie stare, jednoznaczne orphan files.
            Nie zgaduje napraw dla dangling refs.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => execute("audit")}
            disabled={running !== null}
            className="min-h-11 rounded-lg border border-[var(--ops-border)] px-4 text-sm font-semibold disabled:opacity-50"
          >
            {running === "audit" ? (
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            ) : null}
            Audyt
          </button>
          <button
            type="button"
            onClick={() => execute("reconcile")}
            disabled={running !== null || report.staleOrphans.length === 0}
            className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
          >
            {running === "reconcile" ? (
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            ) : null}
            Reconcile
          </button>
        </div>
      </div>

      <dl className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Dangling refs", report.danglingReferences.length],
          ["Stare orphany", report.staleOrphans.length],
          ["Legacy ambiguous", report.ambiguousLegacyFiles.length],
          ["Unsupported", report.unsupportedFiles.length],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-[var(--ops-border)] p-3"
          >
            <dt className="text-xs text-[var(--ops-muted)]">{label}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {message ? (
        <div
          className="mt-4 text-sm text-[var(--ops-muted)]"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}
    </div>
  )
}
