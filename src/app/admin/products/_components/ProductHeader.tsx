"use client"

import { FileDown, Plus, RefreshCcw, Trash2 } from "lucide-react"

interface IProductHeaderProps {
  onImportClick: () => void
  onAddNew: () => void
  onWipe?: () => void
  onPriceListClick: () => void
  isAiView?: boolean
}

export function ProductHeader({
  onImportClick,
  onAddNew,
  onWipe,
  onPriceListClick,
  isAiView,
}: IProductHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 lg:flex-row lg:items-end">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
          Katalog techniczny
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Produkty
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-muted)]">
          SKU, ceny, stan magazynowy, klasyfikacja i źródła danych.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPriceListClick}
          className="min-h-11 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-4 text-sm font-semibold"
        >
          <FileDown className="mr-2 inline h-4 w-4" />
          Cenniki
        </button>

        <button
          type="button"
          onClick={onImportClick}
          className={
            "min-h-11 rounded-lg border px-4 text-sm font-semibold " +
            (isAiView
              ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
              : "border-[var(--ops-border)] bg-[var(--ops-panel)]")
          }
        >
          <RefreshCcw className="mr-2 inline h-4 w-4" />
          {isAiView ? "Ukryj import" : "Import i źródła"}
        </button>

        <button
          type="button"
          onClick={onAddNew}
          className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Dodaj produkt
        </button>

        {onWipe ? (
          <button
            type="button"
            onClick={onWipe}
            className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
            title="Wyczyść katalog"
            aria-label="Wyczyść katalog"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </header>
  )
}
