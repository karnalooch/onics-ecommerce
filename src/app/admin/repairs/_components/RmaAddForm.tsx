"use client"

import { FormEvent, useState } from "react"
import { Loader2, Save, X } from "lucide-react"
import { addRepairAction } from "../_actions"
import type { AdminRma } from "../RepairsDashboardClient"

export function RmaAddForm({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (rma: AdminRma) => void
}) {
  const [client, setClient] = useState("")
  const [item, setItem] = useState("")
  const [serial, setSerial] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    const formData = new FormData()
    formData.set("client", client)
    formData.set("item", item)
    formData.set("serial", serial)
    formData.set("description", description)

    try {
      const result = await addRepairAction(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      onAdd(result.data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xl space-y-5 rounded-3xl bg-white p-7 shadow-2xl dark:bg-[#161616]"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Serwis
            </span>
            <h2 className="mt-1 text-xl font-extrabold">Nowe zgłoszenie RMA</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {[
          ["Klient / partner", client, setClient],
          ["Urządzenie", item, setItem],
          ["Numer seryjny", serial, setSerial],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="block">
            <span className="mb-2 block text-xs font-bold text-muted-foreground">
              {String(label)}
            </span>
            <input
              required
              value={String(value)}
              onChange={(event) => (setter as (value: string) => void)(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-4"
            />
          </label>
        ))}

        <label className="block">
          <span className="mb-2 block text-xs font-bold text-muted-foreground">Opis usterki</span>
          <textarea
            rows={4}
            maxLength={3000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-border bg-background p-4"
          />
        </label>

        {error && <div className="text-sm font-semibold text-red-600">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 px-5 text-sm font-bold">
            Anuluj
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Zapisz RMA
          </button>
        </div>
      </form>
    </div>
  )
}
