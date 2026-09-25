"use client"

import { useId, useState } from "react"
import { Loader2, Send, X } from "lucide-react"

interface QuoteModalProps {
  productId: string
  productName: string
  companyNip: string
  clientEmail: string
  onClose: () => void
}

export function QuoteRequestModal({
  productId,
  productName,
  companyNip,
  clientEmail,
  onClose,
}: QuoteModalProps) {
  const requestId = useId()
  const [quantity, setQuantity] = useState(10)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          expectedQuantity: quantity,
          message,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload.error || "Nie udało się wysłać zapytania.")
        return
      }

      setSuccess(true)
    } catch {
      setError("Nie udało się połączyć z serwisem zapytań.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
              Zapytanie B2B
            </span>
            <h3 className="mt-1 text-xl font-extrabold">Indywidualna wycena</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Send className="h-6 w-6" />
            </div>
            <h4 className="mt-5 text-2xl font-extrabold">Zapytanie zapisane</h4>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Zapytanie zostało przypisane do konta {clientEmail}. Zespół CEL-TRONICS
              może teraz przygotować warunki handlowe.
            </p>
            <button
              onClick={onClose}
              className="mt-7 h-11 rounded-xl bg-primary px-6 text-sm font-extrabold text-white"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 p-7">
            <div className="rounded-2xl bg-muted/40 p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Produkt
              </span>
              <strong className="mt-2 block">{productName}</strong>
              <div className="mt-2 text-xs text-muted-foreground">
                NIP konta: {companyNip || "brak w profilu"} · ref. {requestId.replace(/:/g, "")}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Oczekiwana ilość
              </span>
              <input
                type="number"
                min={1}
                max={100000}
                required
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    Math.max(1, Math.min(100000, Number(event.target.value) || 1))
                  )
                }
                className="h-12 w-full rounded-xl border border-border px-4 font-semibold"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Informacje dodatkowe
              </span>
              <textarea
                rows={4}
                maxLength={3000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Termin projektu, wymagania techniczne, dodatkowe informacje…"
                className="w-full resize-none rounded-xl border border-border p-4 text-sm"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl px-5 text-sm font-bold text-muted-foreground"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Wyślij zapytanie
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
