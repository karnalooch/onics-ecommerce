"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { RmaHeader } from "./_components/RmaHeader"
import { RmaStats } from "./_components/RmaStats"
import { RmaTable } from "./_components/RmaTable"
import { RmaAddForm } from "./_components/RmaAddForm"

export type AdminRma = {
  id: string
  client: string
  item: string
  serial: string
  date: string
  status: string
  description?: string
}

export function RepairsDashboardClient({
  initialData,
}: {
  initialData: AdminRma[]
}) {
  const [rmas, setRmas] = useState(initialData)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => setRmas(initialData), 0)
    return () => window.clearTimeout(timer)
  }, [initialData])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rmas
    return rmas.filter((rma) =>
      [rma.id, rma.client, rma.item, rma.serial, rma.status].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    )
  }, [rmas, search])

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <RmaHeader onAddClick={() => setIsFormOpen(true)} />
      <RmaStats rmas={rmas} />

      <section className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
        <div className="flex flex-col justify-between gap-3 border-b border-[var(--ops-border)] p-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-semibold">Rejestr zgłoszeń</h2>
            <p className="mt-1 text-xs text-[var(--ops-muted)]">
              Dane zapisane w lifecycle RMA.
            </p>
          </div>
          <label className="relative block w-full md:w-80">
            <span className="sr-only">Szukaj zgłoszenia</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="RMA, klient, model, S/N…"
              className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-transparent pl-9 pr-3 text-sm"
            />
          </label>
        </div>
        <RmaTable rmas={filtered} />
      </section>

      {isFormOpen ? (
        <RmaAddForm
          onClose={() => setIsFormOpen(false)}
          onAdd={(rma) => setRmas((current) => [rma, ...current])}
        />
      ) : null}
    </div>
  )
}
