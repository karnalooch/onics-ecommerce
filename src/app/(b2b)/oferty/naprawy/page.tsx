"use client"

import { FormEvent, useEffect, useState } from "react"
import { Loader2, Plus, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

  const loadRepairs = async () => {
    try {
      const response = await fetch("/api/repairs", { cache: "no-store" })
      if (!response.ok) throw new Error("Nie udało się pobrać zgłoszeń.")
      const payload = await response.json()
      setRepairs(Array.isArray(payload) ? payload : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Błąd pobierania.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRepairs()
  }, [])

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
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || "Nie udało się utworzyć zgłoszenia.")
      }

      setRepairs((current) => [payload, ...current])
      setItem("")
      setSerial("")
      setDescription("")
      setFormOpen(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Błąd zapisu zgłoszenia."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold">
            <Wrench className="h-8 w-8 text-primary" />
            Centrum RMA
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Zgłaszaj urządzenia do serwisu i śledź status własnych zgłoszeń.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nowe zgłoszenie
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={submitRepair}
          className="grid gap-5 rounded-3xl border border-border bg-card p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Model urządzenia
              </span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={item}
                onChange={(event) => setItem(event.target.value)}
                className="h-12 w-full rounded-xl border border-border px-4"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Numer seryjny
              </span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                className="h-12 w-full rounded-xl border border-border px-4"
              />
            </label>
          </div>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Opis usterki
            </span>
            <textarea
              required
              minLength={5}
              maxLength={3000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-border p-4"
            />
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wyślij do serwisu
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-lg font-extrabold">Twoje zgłoszenia</h2>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : repairs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nie masz jeszcze zgłoszeń serwisowych.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {repairs.map((repair) => (
              <div
                key={repair.id}
                className="grid gap-4 p-6 md:grid-cols-[1fr_180px_160px] md:items-center"
              >
                <div>
                  <strong className="block">{repair.item}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {repair.id} · S/N {repair.serial}
                  </span>
                  {repair.description && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {repair.description}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(repair.date).toLocaleDateString("pl-PL")}
                </span>
                <Badge variant="outline" className="w-fit">
                  {repair.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
