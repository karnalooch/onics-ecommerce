"use client"

import { FileSpreadsheet, FileText, RefreshCcw, Trash2, Upload } from "lucide-react"
import { WfMagUploadButton } from "./WfMagUploadButton"
import type { ICategory, IManufacturer } from "../_lib/types"

interface IAICommandCenterProps {
  isOpen: boolean
  onToggle: () => void
  sources: string[]
  processedSources: string[]
  isUploading: boolean
  isTraining: boolean
  progressPercent: number
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onTrainSource: (filename: string) => void
  onClearAll: () => void
  knowledgeCount: number
  onExcelParsed: (data: Array<Record<string, unknown>>) => void
  categories: ICategory[]
  manufacturers: IManufacturer[]
  onRefreshStructure: () => void
}

export function AICommandCenter({
  isOpen,
  onToggle,
  sources,
  processedSources,
  isUploading,
  isTraining,
  progressPercent,
  onUpload,
  onTrainSource,
  onClearAll,
  knowledgeCount,
  onExcelParsed,
  categories,
  manufacturers,
  onRefreshStructure,
}: IAICommandCenterProps) {
  return (
    <section className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--ops-border)] p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold">Import i źródła danych</h2>
          <p className="mt-1 text-xs text-[var(--ops-muted)]">
            WF-Mag, katalogi producentów i baza wiedzy zasilają jeden bufor weryfikacji.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="min-h-10 rounded-lg border border-[var(--ops-border)] px-3 text-sm font-semibold"
        >
          {isOpen ? "Ukryj" : "Pokaż"}
        </button>
      </div>

      {isOpen ? (
        <div className="grid gap-4 p-4 xl:grid-cols-3">
          <section className="rounded-lg border border-[var(--ops-border)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ops-muted)]">
              WF-Mag
            </div>
            <h3 className="mt-2 text-base font-semibold">Import magazynowy</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ops-muted)]">
              SKU, ceny i stany trafiają do bufora przed zapisem.
            </p>
            <div className="mt-4">
              <WfMagUploadButton onParsed={onExcelParsed} />
            </div>
          </section>

          <section className="rounded-lg border border-[var(--ops-border)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ops-muted)]">
              Knowledge
            </div>
            <h3 className="mt-2 text-base font-semibold">Katalog producenta</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ops-muted)]">
              PDF/XLS/XLSX jest zapisywany jako źródło wiedzy i może zostać przetworzony.
            </p>

            <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              {isUploading ? (
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Przesyłanie…" : "Wgraj katalog"}
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,.xlsm"
                onChange={onUpload}
                disabled={isUploading}
                className="sr-only"
              />
            </label>

            {isTraining ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--ops-muted)]">Przetwarzanie</span>
                  <span className="font-mono font-semibold">{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-slate-950 dark:bg-white"
                    style={{ width: Math.max(0, Math.min(100, progressPercent)) + "%" }}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-[var(--ops-border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ops-muted)]">
                  Źródła
                </div>
                <h3 className="mt-2 text-base font-semibold">
                  Baza wiedzy
                </h3>
                <p className="mt-1 text-xs text-[var(--ops-muted)]">
                  {knowledgeCount} źródeł · {categories.length} kategorii · {manufacturers.length} producentów
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onRefreshStructure}
                  className="min-h-9 rounded-md border border-[var(--ops-border)] px-2 text-xs font-semibold"
                >
                  Odśwież
                </button>
                <button
                  type="button"
                  onClick={onClearAll}
                  disabled={isTraining || isUploading}
                  className="min-h-9 rounded-md border border-red-200 px-2 text-red-700 disabled:opacity-40 dark:border-red-900 dark:text-red-300"
                  title="Wyczyść bazę wiedzy"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-56 overflow-y-auto divide-y divide-[var(--ops-border)]">
              {sources.length === 0 ? (
                <div className="py-6 text-sm text-[var(--ops-muted)]">
                  Brak źródeł.
                </div>
              ) : (
                sources.map((source) => {
                  const processed = processedSources.includes(source)
                  const PdfIcon = source.toLowerCase().endsWith(".pdf")
                    ? FileText
                    : FileSpreadsheet
                  return (
                    <div
                      key={source}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <PdfIcon className="h-4 w-4 shrink-0 text-[var(--ops-muted)]" />
                        <span className="truncate font-mono text-xs">
                          {source}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTrainSource(source)}
                        disabled={isTraining}
                        className="shrink-0 rounded-md border border-[var(--ops-border)] px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      >
                        {processed ? "Przetwórz ponownie" : "Przetwórz"}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
