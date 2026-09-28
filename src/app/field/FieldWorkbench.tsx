"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react"

type FieldItem = {
  id: string
  sku: string
  name: string
  manufacturer: string
  categoryName: string | null
  subcategoryName: string | null
  price: number | null
  priceHidden: boolean
  stock: number
  description: string
  facts: Array<{ label: string; value: string }>
  procedure: string[]
  source: string | null
}

function formatMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "Cena ukryta"
  return (
    value.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " zł netto"
  )
}

export function FieldWorkbench({
  identity,
  role,
  discount,
}: {
  identity: string
  role: string
  discount: number
}) {
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<FieldItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [ladderMode, setLadderMode] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError("")

      try {
        const response = await fetch(
          "/api/field/search?q=" +
            encodeURIComponent(query) +
            "&limit=20",
          { signal: controller.signal }
        )
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(
            payload?.error || "Nie udało się przeszukać katalogu."
          )
        }

        const nextItems = Array.isArray(payload.items) ? payload.items : []
        setItems(nextItems)
        setSelectedId((current) =>
          current &&
          nextItems.some((item: FieldItem) => item.id === current)
            ? current
            : nextItems[0]?.id || null
        )
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError(
            caught instanceof Error
              ? caught.message
              : "Nie udało się przeszukać katalogu."
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  )

  const accountLabel =
    role === "BIZ" && discount > 0
      ? "Cena konta · rabat " + String(discount) + "%"
      : role

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-slate-950 dark:bg-[#090b0e] dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="text-sm font-extrabold tracking-[0.18em]">ONICS</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Field / installer
            </div>
          </div>
          <div className="text-right">
            <div className="max-w-[180px] truncate text-sm font-semibold">
              {identity}
            </div>
            <div className="text-xs text-slate-500">{accountLabel}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Znajdź urządzenie
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Model, symbol, producent albo parametr techniczny.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={ladderMode}
            onClick={() => setLadderMode((value) => !value)}
            className={
              "min-h-12 rounded-xl border px-4 text-sm font-semibold " +
              (ladderMode
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-300 bg-white dark:border-slate-700 dark:bg-[#0f1216]")
            }
          >
            <Wrench className="mr-2 inline h-4 w-4" />
            Tryb drabiny
          </button>
        </div>

        <label className="relative block">
          <span className="sr-only">Szukaj urządzenia</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="np. BCS, 8 MP PoE, INTEGRA 64…"
            className={
              "w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-base font-medium outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-[#0f1216] dark:focus:border-white " +
              (ladderMode ? "h-16 text-lg" : "h-14")
            }
          />
          {loading ? (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-slate-400" />
          ) : null}
        </label>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
          <section
            aria-label="Wyniki wyszukiwania"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]"
          >
            <div className="flex min-h-12 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Wyniki
              </span>
              <span className="font-mono text-xs text-slate-500">
                {items.length}
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {!loading && items.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">
                  Brak wyników. Spróbuj symbolu albo konkretnego parametru.
                </div>
              ) : null}

              {items.map((item) => {
                const active = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={
                      "w-full min-h-[88px] px-4 py-3 text-left transition-colors " +
                      (active
                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.03]")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm font-semibold">
                          {item.sku}
                        </div>
                        <div
                          className={
                            "mt-1 truncate text-sm " +
                            (active ? "opacity-75" : "text-slate-500")
                          }
                        >
                          {item.manufacturer} ·{" "}
                          {item.subcategoryName ||
                            item.categoryName ||
                            "Bez kategorii"}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 opacity-50" />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold">
                        {item.stock > 0
                          ? "Stan: " + String(item.stock)
                          : "Stan: 0"}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatMoney(item.price)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            aria-live="polite"
            className="min-w-0 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]"
          >
            {!selected ? (
              <div className="flex min-h-[320px] items-center justify-center p-8 text-center text-sm text-slate-500">
                Wybierz urządzenie z listy.
              </div>
            ) : (
              <div className={ladderMode ? "p-5 sm:p-7" : "p-5"}>
                <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {selected.manufacturer}
                    </div>
                    <h2
                      className={
                        "mt-2 break-words font-mono font-semibold " +
                        (ladderMode
                          ? "text-2xl sm:text-3xl"
                          : "text-xl sm:text-2xl")
                      }
                    >
                      {selected.sku}
                    </h2>
                    {selected.name !== selected.sku ? (
                      <p className="mt-2 text-sm text-slate-500">
                        {selected.name}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:text-right">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Twoja cena
                    </div>
                    <div
                      className={
                        "mt-1 font-semibold " +
                        (ladderMode ? "text-2xl" : "text-xl")
                      }
                    >
                      {formatMoney(selected.price)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selected.stock > 0
                        ? "Stan magazynowy: " + String(selected.stock)
                        : "Brak stanu magazynowego"}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Najważniejsze dane
                  </div>
                  {selected.facts.length > 0 ? (
                    <dl
                      className={
                        "mt-2 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 " +
                        (ladderMode
                          ? "sm:grid-cols-2"
                          : "sm:grid-cols-2 xl:grid-cols-3")
                      }
                    >
                      {selected.facts.map((fact) => (
                        <div
                          key={fact.label}
                          className={
                            "bg-white p-4 dark:bg-[#0f1216] " +
                            (ladderMode ? "min-h-24" : "min-h-20")
                          }
                        >
                          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {fact.label}
                          </dt>
                          <dd
                            className={
                              "mt-2 font-mono font-semibold " +
                              (ladderMode ? "text-xl" : "text-base")
                            }
                          >
                            {fact.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="mt-2 rounded-lg border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800">
                      Brak ustrukturyzowanych parametrów. Poniżej pozostaje opis źródłowy.
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                    Zweryfikowana procedura
                  </div>
                  {selected.procedure.length > 0 ? (
                    <ol className="mt-3 space-y-2">
                      {selected.procedure.map((step, index) => (
                        <li
                          key={String(index) + "-" + step}
                          className={
                            "flex gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 " +
                            (ladderMode ? "min-h-16 text-base" : "text-sm")
                          }
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 font-mono font-semibold dark:border-slate-700">
                            {index + 1}
                          </span>
                          <span className="pt-1 leading-6">{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                      Brak zweryfikowanej instrukcji krok po kroku w bazie.
                      ONICS nie generuje procedury z domysłów.
                      <Link href="/kontakt" className="ml-1 font-semibold underline">
                        Pomoc techniczna
                      </Link>
                    </div>
                  )}
                </div>

                {!ladderMode ? (
                  <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Opis źródłowy
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {selected.description || "Brak opisu technicznego."}
                    </p>
                    <div className="mt-3 font-mono text-xs text-slate-500">
                      Źródło: {selected.source || "katalog główny"}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
