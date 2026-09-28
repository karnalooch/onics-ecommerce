"use client"

import { Check } from "lucide-react"
import type { ICategory } from "../_lib/types"

interface IStagingBatchActionsProps {
  selectedIds: string[]
  onBatchUpdate: (ids: string[], field: string, value: unknown) => void
  onBatchCommit: (ids: string[]) => void
  categories: ICategory[]
  manufacturers: string[]
}

export function StagingBatchActions({
  selectedIds,
  onBatchUpdate,
  onBatchCommit,
  categories,
  manufacturers,
}: IStagingBatchActionsProps) {
  if (selectedIds.length === 0) return null

  return (
    <div className="sticky bottom-4 z-40 mt-4 rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-[140px]">
          <div className="text-xs text-[var(--ops-muted)]">Wybrane pozycje</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {selectedIds.length}
          </div>
        </div>

        <label className="flex-1">
          <span className="sr-only">Zmień kategorię dla wybranych</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onBatchUpdate(selectedIds, "categoryId", event.target.value)
                event.currentTarget.value = ""
              }
            }}
            className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Ustaw kategorię…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="sr-only">Zmień producenta dla wybranych</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onBatchUpdate(selectedIds, "manufacturer", event.target.value)
                event.currentTarget.value = ""
              }
            }}
            className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Ustaw producenta…
            </option>
            {manufacturers.map((manufacturer) => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onBatchCommit(selectedIds)}
          className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          <Check className="mr-2 inline h-4 w-4" />
          Zapisz wybrane
        </button>
      </div>
    </div>
  )
}
