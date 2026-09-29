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
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-col justify-between gap-5 border-b border-[#d9dbdc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-base font-semibold text-primary">Serwis</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
            Zgłoszenia serwisowe
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Zgłoś urządzenie do serwisu i sprawdzaj jego bieżący status w jednym miejscu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white hover:bg-[#a9161c]"
        >
          <Plus className="h-4 w-4" />
          Nowe zgłoszenie
        </button>
      </header>

      {formOpen ? (
        <form
          onSubmit={submitRepair}
          className="mt-6 border border-[#d9dbdc] bg-white p-5 sm:p-6"
        >
          <h2 className="text-xl font-semibold text-slate-950">Nowe zgłoszenie serwisowe</h2>
          <p className="mt-2 text-[15px] leading-6 text-slate-600">
            Podaj urządzenie, numer seryjny i możliwie konkretny opis usterki.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-base font-medium text-slate-900">
                Model urządzenia
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={item}
                onChange={(event) => setItem(event.target.value)}
                className="h-12 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none focus:border-primary"
              />
            </label>

            <label>
              <span className="mb-2 block text-base font-medium text-slate-900">
                Numer seryjny
              </span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                className="h-12 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 font-mono text-base text-slate-950 outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-base font-medium text-slate-900">
              Opis usterki
            </span>
            <textarea
              required
              minLength={5}
              maxLength={3000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-lg border border-[#cfd2d4] bg-white p-4 text-base leading-7 text-slate-950 outline-none focus:border-primary"
            />
          </label>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-11 rounded-lg border border-[#cfd2d4] px-4 text-base font-medium text-slate-700"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white hover:bg-[#a9161c] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              Wyślij do serwisu
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-[15px] text-red-900">
          {error}
        </div>
      ) : null}

      <section className="mt-6 overflow-hidden border border-[#d9dbdc] bg-white">
        <div className="flex items-center justify-between border-b border-[#d9dbdc] bg-[#f1f1ee] px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Twoje zgłoszenia</h2>
          <span className="font-mono text-xs text-slate-500">{repairs.length}</span>
        </div>

        {loading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="p-8 text-center text-base text-slate-600">
            Nie masz jeszcze zgłoszeń serwisowych.
          </div>
        ) : (
          <div className="divide-y divide-[#e0e1e1]">
            {repairs.map((repair) => (
              <div
                key={repair.id}
                className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_140px_150px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-950">{repair.item}</div>
                  <div className="mt-1 font-mono text-xs text-slate-500">
                    {repair.id} · S/N {repair.serial}
                  </div>
                  {repair.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {repair.description}
                    </p>
                  ) : null}
                </div>

                <div className="text-sm text-slate-600">
                  {new Date(repair.date).toLocaleDateString("pl-PL")}
                </div>

                <div className="border-l-2 border-[#d9dbdc] pl-3 text-sm font-semibold text-slate-800">
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
