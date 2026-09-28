"use client"

import { ChevronDown, ChevronRight, Package, Search } from "lucide-react"
import { useState } from "react"
import type { ICategory } from "../_lib/types"

interface IProductSidebarProps {
  categories: ICategory[]
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCatId: string | null
  setSelectedCatId: (id: string | null) => void
  selectedSubcatId: string | null
  setSelectedSubcatId: (id: string | null) => void
  selectedManufacturer: string
  setSelectedManufacturer: (manufacturer: string) => void
  manufacturersList: string[]
  showOnlyInStock: boolean
  setShowOnlyInStock: (value: boolean) => void
}

export function ProductSidebar({
  categories,
  searchTerm,
  setSearchTerm,
  selectedCatId,
  setSelectedCatId,
  selectedSubcatId,
  setSelectedSubcatId,
  selectedManufacturer,
  setSelectedManufacturer,
  manufacturersList,
  showOnlyInStock,
  setShowOnlyInStock,
}: IProductSidebarProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const reset = () => {
    setSearchTerm("")
    setSelectedCatId(null)
    setSelectedSubcatId(null)
    setSelectedManufacturer("ALL")
    setShowOnlyInStock(false)
  }

  const toggleCat = (id: string) => {
    const next = new Set(expandedCats)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedCats(next)
  }

  return (
    <aside className="sticky top-20 space-y-3">
      <section className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Filtry katalogu</h2>
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-[var(--ops-muted)] hover:text-foreground"
          >
            Wyczyść
          </button>
        </div>

        <label className="relative mt-3 block">
          <span className="sr-only">Szukaj produktu</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-muted)]" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Model, SKU lub nazwa…"
            className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-transparent pl-9 pr-3 text-sm outline-none focus:border-slate-500"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowOnlyInStock(false)}
            className={
              "min-h-10 rounded-lg border px-3 text-sm font-semibold " +
              (!showOnlyInStock
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-[var(--ops-border)]")
            }
          >
            Wszystkie
          </button>
          <button
            type="button"
            onClick={() => setShowOnlyInStock(true)}
            className={
              "min-h-10 rounded-lg border px-3 text-sm font-semibold " +
              (showOnlyInStock
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-[var(--ops-border)]")
            }
          >
            <Package className="mr-2 inline h-4 w-4" />
            Na stanie
          </button>
        </div>
      </section>

      <section className="max-h-[calc(100vh-24rem)] overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
        <div className="border-b border-[var(--ops-border)] px-4 py-3 text-sm font-semibold">
          Kategorie
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCatId(null)
              setSelectedSubcatId(null)
            }}
            className={
              "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold " +
              (!selectedCatId
                ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                : "hover:bg-slate-50 dark:hover:bg-white/[0.04]")
            }
          >
            Wszystkie produkty
          </button>

          {categories.map((category) => {
            const expanded = expandedCats.has(category.id)
            const active = selectedCatId === category.id && !selectedSubcatId
            return (
              <div key={category.id} className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCatId(category.id)
                    setSelectedSubcatId(null)
                    toggleCat(category.id)
                  }}
                  className={
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm " +
                    (active
                      ? "bg-slate-100 font-semibold dark:bg-white/[0.06]"
                      : "hover:bg-slate-50 dark:hover:bg-white/[0.04]")
                  }
                >
                  <span className="truncate">{category.name}</span>
                  {category.subcategories.length > 0 ? (
                    expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ops-muted)]" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ops-muted)]" />
                    )
                  ) : null}
                </button>

                {expanded && category.subcategories.length > 0 ? (
                  <div className="ml-3 border-l border-[var(--ops-border)] pl-2">
                    {category.subcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        type="button"
                        onClick={() => {
                          setSelectedCatId(category.id)
                          setSelectedSubcatId(subcategory.id)
                        }}
                        className={
                          "mt-1 w-full rounded-md px-3 py-2 text-left text-sm " +
                          (selectedSubcatId === subcategory.id
                            ? "bg-slate-100 font-semibold dark:bg-white/[0.06]"
                            : "text-[var(--ops-muted)] hover:text-foreground")
                        }
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <label className="block rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-4">
        <span className="mb-2 block text-sm font-semibold">Producent</span>
        <div className="relative">
          <select
            value={selectedManufacturer}
            onChange={(event) => setSelectedManufacturer(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-[var(--ops-border)] bg-transparent px-3 pr-9 text-sm"
          >
            <option value="ALL">Wszyscy producenci</option>
            {manufacturersList.map((manufacturer) => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-muted)]" />
        </div>
      </label>
    </aside>
  )
}
