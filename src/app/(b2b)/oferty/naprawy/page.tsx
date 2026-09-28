"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Wrench } from "lucide-react"

type Repair = {
  id: string
  item: string
  serial: string
  description?: string
  date: string
  status: string
}

export default function RmaInstallerPage() {
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [item, setItem] = useState("")
  const [serial, setSerial] = useState("")
  const [description, setDescription] = useState("")

  const loadRepairs = useCallback(async () => {
    setError("")
    try {
      const response = await fetch("/api/repairs", { cache: "no-store" })
      const payload: unknown = await response.json().catch(() => [])
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Nie udało się pobrać zgłoszeń.")
      }
      setRepairs(payload as Repair[])
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Nie udało się pobrać zgłoszeń."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRepairs()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadRepairs])

  const submitRepair = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, serial, description }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("id" in payload)
      ) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Nie udało się utworzyć zgłoszenia."
        throw new Error(message)
      }

      setRepairs((current) => [payload as Repair, ...current])
      setItem("")
      setSerial("")
      setDescription("")
      setFormOpen(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nie udało się utworzyć zgłoszenia."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Serwis
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Zgłoszenia serwisowe
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Zgłoś urządzenie i śledź jego status bez kontaktowania się po numer RMA.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Nowe zgłoszenie
        </button>
      </header>

      {formOpen ? (
        <form
          onSubmit={submitRepair}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f1216]"
        >
          <h2 className="text-sm font-semibold">Nowe zgłoszenie</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Model urządzenia
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={item}
                onChange={(event) => setItem(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Numer seryjny
              </span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-300 bg-transparent px-3 font-mono dark:border-slate-700"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold">
              Opis usterki
            </span>
            <textarea
              required
              minLength={5}
              maxLength={3000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700"
            />
          </label>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-700"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {saving ? (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="mr-2 inline h-4 w-4" />
              )}
              Wyślij do serwisu
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Twoje zgłoszenia</h2>
          <span className="font-mono text-xs text-slate-500">
            {repairs.length}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nie masz jeszcze zgłoszeń serwisowych.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {repairs.map((repair) => (
              <div
                key={repair.id}
                className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_140px_140px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{repair.item}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {repair.id} · S/N {repair.serial}
                  </div>
                  {repair.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {repair.description}
                    </p>
                  ) : null}
                </div>
                <div className="text-sm text-slate-500">
                  {new Date(repair.date).toLocaleDateString("pl-PL")}
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-slate-800">
                  {repair.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
