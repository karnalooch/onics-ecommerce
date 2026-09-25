"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Wrench } from "lucide-react"
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

  useEffect(() => setRmas(initialData), [initialData])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rmas
    return rmas.filter((rma) =>
      [rma.id, rma.client, rma.item, rma.serial, rma.status]
        .some((value) => String(value || "").toLowerCase().includes(query))
    )
  }, [rmas, search])

  return (
    <div className="mx-auto flex max-w-[1920px] flex-col gap-8 pb-20">
      <RmaHeader onAddClick={() => setIsFormOpen(true)} />
      <RmaStats rmas={rmas} />

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-border p-6 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Wrench className="h-5 w-5 text-primary" />
              Rejestr zgłoszeń serwisowych
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dane pochodzą z zapisanych zgłoszeń RMA — bez symulowanych gwarancji i statusów.
            </p>
          </div>
          <label className="relative block w-full md:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ID, klient, model, S/N…"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm"
            />
          </label>
        </div>
        <RmaTable rmas={filtered} />
      </section>

      {isFormOpen && (
        <RmaAddForm
          onClose={() => setIsFormOpen(false)}
          onAdd={(rma) => setRmas((current) => [rma, ...current])}
        />
      )}
    </div>
  )
}
