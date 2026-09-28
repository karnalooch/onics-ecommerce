"use client"

import { Search } from "lucide-react"

export type ShopCategory = {
  id: string
  name: string
}

interface ShopSidebarProps {
  categories: ShopCategory[]
  selectedCatId: string | null
  onSelect: (id: string | null) => void
  search: string
  onSearchChange: (value: string) => void
}

export function ShopSidebar({
  categories,
  selectedCatId,
  onSelect,
  search,
  onSearchChange,
}: ShopSidebarProps) {
  return (
    <aside className="sticky top-24 space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0f1216]">
        <h2 className="text-sm font-semibold">Znajdź urządzenie</h2>
        <label className="relative mt-3 block">
          <span className="sr-only">Szukaj produktu</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Model, SKU, producent…"
            className="h-11 w-full rounded-lg border border-slate-300 bg-transparent pl-9 pr-3 text-sm outline-none focus:border-slate-950 dark:border-slate-700 dark:focus:border-white"
          />
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          Kategorie
        </div>
        <div className="p-2">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={
              "w-full rounded-lg px-3 py-2 text-left text-sm " +
              (!selectedCatId
                ? "bg-slate-950 font-semibold text-white dark:bg-white dark:text-slate-950"
                : "hover:bg-slate-50 dark:hover:bg-white/[0.04]")
            }
          >
            Wszystkie produkty
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={
                "mt-1 w-full rounded-lg px-3 py-2 text-left text-sm " +
                (selectedCatId === category.id
                  ? "bg-slate-100 font-semibold dark:bg-white/[0.06]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-foreground dark:hover:bg-white/[0.04]")
              }
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">
        <div className="font-semibold text-foreground">CEL-TRONICS</div>
        <p className="mt-1">
          Potrzebujesz doboru urządzeń albo wyceny projektu? Skontaktuj się z
          naszym zespołem technicznym.
        </p>
      </section>
    </aside>
  )
}
