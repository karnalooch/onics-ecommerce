"use client"

import { memo } from "react"
import { AlertTriangle, Check, X } from "lucide-react"

interface StructureApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onApprove: () => void
  newCategories: string[]
  newSubcategories: { parent: string; name: string }[]
  newManufacturers: string[]
}

export const StructureApprovalModal = memo(function StructureApprovalModal({
  isOpen,
  onClose,
  onApprove,
  newCategories,
  newSubcategories,
  newManufacturers,
}: StructureApprovalModalProps) {
  if (!isOpen) return null

  const total =
    newCategories.length +
    newSubcategories.length +
    newManufacturers.length

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="structure-approval-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ops-muted)]">
              Import katalogu
            </div>
            <h2
              id="structure-approval-title"
              className="mt-1 text-xl font-semibold"
            >
              Nowe elementy struktury
            </h2>
            <p className="mt-2 text-sm text-[var(--ops-muted)]">
              Wykryto {total} pozycji wymagających potwierdzenia przed dalszą weryfikacją.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border)]"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto p-5">
          {newCategories.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Kategorie</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {newCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-md border border-[var(--ops-border)] px-2.5 py-1.5 text-sm"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {newSubcategories.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Podkategorie</h3>
              <div className="mt-2 divide-y divide-[var(--ops-border)] overflow-hidden rounded-lg border border-[var(--ops-border)]">
                {newSubcategories.map((subcategory) => (
                  <div
                    key={subcategory.parent + "::" + subcategory.name}
                    className="grid gap-1 px-3 py-2 sm:grid-cols-[160px_minmax(0,1fr)]"
                  >
                    <span className="text-xs text-[var(--ops-muted)]">
                      {subcategory.parent}
                    </span>
                    <span className="text-sm font-medium">
                      {subcategory.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {newManufacturers.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Producenci</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {newManufacturers.map((manufacturer) => (
                  <span
                    key={manufacturer}
                    className="rounded-md border border-[var(--ops-border)] px-2.5 py-1.5 text-sm"
                  >
                    {manufacturer}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Potwierdzenie akceptuje proponowane mapowanie w buforze.
              Zapis nowych kategorii, podkategorii i producentów nastąpi dopiero
              przy jawnej operacji zapisu produktów.
            </p>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-[var(--ops-border)] p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-[var(--ops-border)] px-4 text-sm font-semibold"
          >
            Wróć do korekty
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            <Check className="mr-2 inline h-4 w-4" />
            Potwierdź mapowanie
          </button>
        </footer>
      </div>
    </div>
  )
})
