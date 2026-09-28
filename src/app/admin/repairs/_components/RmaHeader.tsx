"use client"

import { Plus } from "lucide-react"

export function RmaHeader({ onAddClick }: { onAddClick: () => void }) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 sm:flex-row sm:items-end">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
          Serwis i RMA
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Zgłoszenia serwisowe
        </h1>
        <p className="mt-2 text-sm text-[var(--ops-muted)]">
          Kolejka urządzeń, diagnoza, naprawa i zakończenie obsługi.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddClick}
        className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        Nowe zgłoszenie
      </button>
    </header>
  )
}
