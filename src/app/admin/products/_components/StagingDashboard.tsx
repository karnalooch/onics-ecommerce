"use client"

import { memo, useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronDown, Search, Trash2 } from "lucide-react"
import { StagingItem } from "./StagingItem"
import { StagingBatchActions } from "./StagingBatchActions"
import type { ICategory, IStagingItem } from "../_lib/types"

interface IStagingDashboardProps {
  payload: IStagingItem[]
  importing: boolean
  onClear: () => void
  onCommitAll: () => void
  onRemoveItem: (id: string, sku: string) => void
  onUpdateItem: (id: string, field: string, value: unknown) => void
  onCommitItem: (id: string) => void
  onBatchUpdate: (ids: string[], field: string, value: unknown) => void
  onBatchCommit: (ids: string[]) => void
  isTraining?: boolean
  progressPercent?: number
  categories: ICategory[]
  manufacturers: string[]
  importSummary?: string | null
  importSummaryType?: "success" | "error"
  isItemConfirmed: (item: IStagingItem) => boolean
}

export const StagingDashboard = memo(function StagingDashboard({
  payload,
  importing,
  onClear,
  onCommitAll,
  onUpdateItem,
  onCommitItem,
  onRemoveItem,
  onBatchUpdate,
  onBatchCommit,
  categories,
  manufacturers,
  importSummary,
  importSummaryType,
  isItemConfirmed,
  isTraining,
  progressPercent,
}: IStagingDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(20)

  const filtered = useMemo(() => {
    let result = payload
    if (showConflictsOnly) {
      result = result.filter((item) => item.priceMismatch)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.sku?.toLowerCase().includes(query) ||
          item.name?.toLowerCase().includes(query)
      )
    }
    return result
  }, [payload, searchQuery, showConflictsOnly])

  const confirmedCount = payload.filter(isItemConfirmed).length
  const allConfirmed = payload.length > 0 && confirmedCount === payload.length

  const toggleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id]
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] p-4 xl:flex-row xl:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ops-muted)]">
            Bufor weryfikacji
          </div>
          <h2 className="mt-1 text-lg font-semibold">
            Pozycje przed zapisem
          </h2>
          <p className="mt-1 text-xs text-[var(--ops-muted)]">
            Zweryfikowane {confirmedCount} / {payload.length}
            {isTraining ? " · analiza " + String(progressPercent || 0) + "%" : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            className="min-h-10 rounded-lg border border-[var(--ops-border)] px-3 text-sm font-semibold"
          >
            {isCollapsed ? "Pokaż pozycje" : "Zwiń"}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
          >
            <Trash2 className="mr-2 inline h-4 w-4" />
            Wyczyść
          </button>
          <button
            type="button"
            onClick={onCommitAll}
            disabled={importing || !allConfirmed}
            className="min-h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
          >
            <Check className="mr-2 inline h-4 w-4" />
            {importing ? "Zapisywanie…" : "Zapisz wszystkie"}
          </button>
        </div>
      </div>

      {!isCollapsed ? (
        <>
          <div className="flex flex-col gap-3 border-b border-[var(--ops-border)] p-4 md:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Filtruj bufor</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-muted)]" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="SKU lub nazwa…"
                className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-transparent pl-9 pr-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowConflictsOnly((value) => !value)}
              aria-pressed={showConflictsOnly}
              className={
                "min-h-10 rounded-lg border px-3 text-sm font-semibold " +
                (showConflictsOnly
                  ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  : "border-[var(--ops-border)]")
              }
            >
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              Tylko konflikty
            </button>
          </div>

          {importSummary ? (
            <div
              className={
                "border-b border-[var(--ops-border)] px-4 py-3 text-sm " +
                (importSummaryType === "error"
                  ? "bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
                  : "bg-slate-50 dark:bg-white/[0.03]")
              }
            >
              {importSummary}
            </div>
          ) : null}

          <div className="space-y-2 p-4">
            {filtered.slice(0, visibleCount).map((item) => (
              <StagingItem
                key={item.tempId}
                item={item}
                categories={categories}
                manufacturers={manufacturers}
                onUpdate={onUpdateItem}
                onCommit={onCommitItem}
                onRemove={onRemoveItem}
                isItemConfirmed={isItemConfirmed}
                isSelected={selectedIds.includes(item.tempId)}
                onToggleSelect={() => toggleSelect(item.tempId)}
              />
            ))}

            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--ops-muted)]">
                Brak pozycji spełniających filtr.
              </div>
            ) : null}

            {visibleCount < filtered.length ? (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((value) => value + 50)}
                  className="min-h-10 rounded-lg border border-[var(--ops-border)] px-4 text-sm font-semibold"
                >
                  <ChevronDown className="mr-2 inline h-4 w-4" />
                  Pokaż kolejne {Math.min(50, filtered.length - visibleCount)}
                </button>
              </div>
            ) : null}
          </div>

          <StagingBatchActions
            selectedIds={selectedIds}
            onBatchUpdate={onBatchUpdate}
            onBatchCommit={onBatchCommit}
            categories={categories}
            manufacturers={manufacturers}
          />
        </>
      ) : null}
    </section>
  )
})
