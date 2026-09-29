"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
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
  if (value == null || !Number.isFinite(value)) return "Cena niedostępna"
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
      ? "Rabat konta " + String(discount) + "%"
      : role

  return (
    <div className="min-h-screen bg-[#f3f3ef] text-slate-950">
      <header className="border-b border-[#d9dbdc] bg-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard" className="shrink-0" aria-label="Wróć do strefy partnera">
              <Image
                src="/assets/logo.svg"
                alt="CEL-TRONICS"
                width={154}
                height={31}
                priority
                className="h-auto w-[142px] sm:w-[154px]"
              />
            </Link>
            <div className="hidden border-l border-[#d9dbdc] pl-4 sm:block">
              <div className="text-sm font-semibold text-slate-900">Tryb instalatora</div>
              <div className="mt-0.5 text-xs text-slate-500">wyszukiwanie techniczne</div>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <div className="max-w-[220px] truncate text-sm font-semibold text-slate-900">
              {identity}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">{accountLabel}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-4 border-b border-[#d9dbdc] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Strefa partnera
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
              Znajdź urządzenie
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Model, SKU, producent albo parametr techniczny.
            </p>
          </div>

          <button
            type="button"
            aria-pressed={ladderMode}
            onClick={() => setLadderMode((value) => !value)}
            className={
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 text-base font-semibold transition " +
              (ladderMode
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-[#cfd2d4] bg-white text-slate-800 hover:border-slate-400")
            }
          >
            <Wrench className="h-4 w-4" />
            Tryb drabiny
          </button>
        </div>

        <label className="relative mt-6 block">
          <span className="sr-only">Szukaj urządzenia</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="np. BCS, 8 MP PoE, INTEGRA 64…"
            className={
              "w-full rounded-lg border border-[#cfd2d4] bg-white pl-12 pr-12 font-medium text-slate-950 outline-none focus:border-primary " +
              (ladderMode ? "h-16 text-lg" : "h-14 text-base")
            }
          />
          {loading ? (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-slate-500" />
          ) : null}
        </label>

        {error ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-[15px] text-red-900">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
          <section
            aria-label="Wyniki wyszukiwania"
            className="overflow-hidden border border-[#d9dbdc] bg-white"
          >
            <div className="flex min-h-12 items-center justify-between border-b border-[#d9dbdc] bg-[#f1f1ee] px-4">
              <span className="text-sm font-semibold text-slate-700">Wyniki</span>
              <span className="font-mono text-xs text-slate-500">{items.length}</span>
            </div>

            <div className="divide-y divide-[#e0e1e1]">
              {!loading && items.length === 0 ? (
                <div className="p-5 text-[15px] leading-6 text-slate-600">
                  Brak wyników. Spróbuj symbolu, producenta albo konkretnego parametru.
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
                      "w-full min-h-[96px] px-4 py-3 text-left transition-colors " +
                      (active
                        ? "border-l-4 border-primary bg-[#fbf7f7] pl-3"
                        : "border-l-4 border-transparent hover:bg-[#fafaf8]")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm font-semibold text-slate-950">
                          {item.sku}
                        </div>
                        <div className="mt-1 truncate text-sm text-slate-600">
                          {item.manufacturer} ·{" "}
                          {item.subcategoryName ||
                            item.categoryName ||
                            "Bez kategorii"}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={
                          "text-sm font-semibold " +
                          (item.stock > 0 ? "text-[#16794b]" : "text-slate-500")
                        }
                      >
                        {item.stock > 0 ? "Stan: " + String(item.stock) : "Brak na stanie"}
                      </span>
                      <span className="text-sm font-semibold text-slate-950">
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
            className="min-w-0 border border-[#d9dbdc] bg-white"
          >
            {!selected ? (
              <div className="flex min-h-[360px] items-center justify-center p-8 text-center text-base text-slate-600">
                Wybierz urządzenie z listy.
              </div>
            ) : (
              <div className={ladderMode ? "p-5 sm:p-7" : "p-5 sm:p-6"}>
                <div className="grid gap-5 border-b border-[#d9dbdc] pb-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">
                      {selected.manufacturer}
                    </div>
                    <h2
                      className={
                        "mt-2 break-words font-mono font-semibold text-slate-950 " +
                        (ladderMode ? "text-3xl" : "text-2xl")
                      }
                    >
                      {selected.sku}
                    </h2>
                    {selected.name !== selected.sku ? (
                      <p className="mt-2 text-base leading-6 text-slate-600">
                        {selected.name}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:text-right">
                    <div className="text-sm font-medium text-slate-500">Cena konta</div>
                    <div
                      className={
                        "mt-1 font-semibold text-slate-950 " +
                        (ladderMode ? "text-3xl" : "text-2xl")
                      }
                    >
                      {formatMoney(selected.price)}
                    </div>
                    <div
                      className={
                        "mt-1 text-sm font-medium " +
                        (selected.stock > 0 ? "text-[#16794b]" : "text-slate-500")
                      }
                    >
                      {selected.stock > 0
                        ? "Stan magazynowy: " + String(selected.stock)
                        : "Brak stanu magazynowego"}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-base font-semibold text-slate-950">
                    Najważniejsze dane techniczne
                  </h3>
                  {selected.facts.length > 0 ? (
                    <dl
                      className={
                        "mt-3 grid border border-[#d9dbdc] " +
                        (ladderMode
                          ? "sm:grid-cols-2"
                          : "sm:grid-cols-2 xl:grid-cols-3")
                      }
                    >
                      {selected.facts.map((fact) => (
                        <div
                          key={fact.label}
                          className={
                            "border-b border-r border-[#e0e1e1] bg-[#fafaf8] p-4 " +
                            (ladderMode ? "min-h-24" : "min-h-20")
                          }
                        >
                          <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
                            {fact.label}
                          </dt>
                          <dd
                            className={
                              "mt-2 font-mono font-semibold text-slate-950 " +
                              (ladderMode ? "text-xl" : "text-base")
                            }
                          >
                            {fact.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="mt-3 border-l-2 border-[#d9dbdc] bg-[#fafaf8] px-4 py-3 text-[15px] leading-6 text-slate-600">
                      Brak ustrukturyzowanych parametrów. Poniżej pozostaje opis źródłowy.
                    </div>
                  )}
                </div>

                <div className="mt-7">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#16794b]" />
                    <h3 className="text-base font-semibold text-slate-950">
                      Zweryfikowana procedura
                    </h3>
                  </div>
                  {selected.procedure.length > 0 ? (
                    <ol className="mt-3 divide-y divide-[#d9dbdc] border-y border-[#d9dbdc]">
                      {selected.procedure.map((step, index) => (
                        <li
                          key={String(index) + "-" + step}
                          className={
                            "grid gap-3 py-4 sm:grid-cols-[42px_minmax(0,1fr)] " +
                            (ladderMode ? "text-lg" : "text-base")
                          }
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cfd2d4] font-mono text-sm font-semibold text-slate-700">
                            {index + 1}
                          </span>
                          <span className="leading-7 text-slate-800">{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-3 border-l-2 border-[#b7791f] bg-[#fff9e8] px-4 py-3 text-[15px] leading-6 text-[#6b4f11]">
                      Brak zweryfikowanej instrukcji krok po kroku w bazie. Nie tworzymy
                      procedur na podstawie domysłów.
                      <Link href="/kontakt" className="ml-1 font-semibold underline">
                        Pomoc techniczna
                      </Link>
                    </div>
                  )}
                </div>

                {!ladderMode ? (
                  <div className="mt-7 border-t border-[#d9dbdc] pt-5">
                    <h3 className="text-base font-semibold text-slate-950">Opis źródłowy</h3>
                    <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                      {selected.description || "Brak opisu technicznego."}
                    </p>
                    <div className="mt-4 font-mono text-xs text-slate-500">
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
