"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CreditCard,
  Power,
  RefreshCcw,
  ShieldCheck,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"

type PaymentMethod = {
  id: "STRIPE"
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  updatedAt: string | null
}

export default function AdminPaymentsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadMethods = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/payment-methods", {
        cache: "no-store",
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się pobrać metod płatności.")
      }
      setMethods(data?.methods ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się pobrać metod płatności."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMethods()
  }, [loadMethods])

  const toggleMethod = async (method: PaymentMethod) => {
    const nextEnabled = !method.enabled

    if (
      !nextEnabled &&
      !window.confirm(
        "Wyłączyć Stripe dla nowych płatności? Istniejące transakcje, webhooki, refundy i RMA nadal będą obsługiwane."
      )
    ) {
      return
    }

    setSaving(method.id)
    try {
      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: method.id,
          enabled: nextEnabled,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || "Nie udało się zmienić ustawień płatności."
        )
      }

      setMethods(data?.methods ?? [])
      toast.success(
        nextEnabled
          ? "Stripe włączony dla nowych płatności."
          : "Stripe wyłączony dla nowych płatności."
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się zmienić ustawień płatności."
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 pb-20 max-w-[1400px] mx-auto">
      <div className="border-b-2 border-slate-950 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              PAYMENT_CONTROL
            </span>
            <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic">
              Metody płatności
            </h1>
          </div>
        </div>

        <button
          onClick={loadMethods}
          disabled={loading}
          className="h-11 px-5 border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:border-slate-950 disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Odśwież status
        </button>
      </div>

      <div className="border-l-4 border-primary bg-primary/5 px-6 py-5">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-950">
              Przełączniki dotyczą tworzenia nowych płatności
            </p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Wyłączenie dostawcy nie zatrzymuje webhooków ani obsługi istniejących
              zamówień, refundów, anulowań i RMA. Dzięki temu otwarte transakcje
              mogą zostać bezpiecznie rozliczone.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 border border-slate-100 bg-white flex items-center justify-center">
          <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {methods.map((method) => {
            const canEnable = method.configured
            const busy = saving === method.id

            return (
              <section
                key={method.id}
                className="bg-white border border-slate-100 shadow-sm"
              >
                <div className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                  <div className="flex items-start gap-5">
                    <div
                      className={`w-12 h-12 flex items-center justify-center ${method.enabled ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}
                    >
                      <CreditCard className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-950">
                          {method.name}
                        </h2>
                        <span
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${method.enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {method.enabled ? "AKTYWNA" : "WYŁĄCZONA"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                          {method.configured ? (
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-slate-500">
                            Konfiguracja: {method.configured ? "OK" : "BRAK"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                          <Webhook
                            className={`w-4 h-4 ${method.webhookConfigured ? "text-green-600" : "text-amber-500"}`}
                          />
                          <span className="text-slate-500">
                            Webhook:{" "}
                            {method.webhookConfigured ? "OK" : "NIESKONFIGUROWANY"}
                          </span>
                        </div>
                      </div>

                      {method.updatedAt && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                          Ostatnia zmiana:{" "}
                          {new Date(method.updatedAt).toLocaleString("pl-PL")}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleMethod(method)}
                    disabled={busy || (!method.enabled && !canEnable)}
                    className={`min-w-[240px] h-14 px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${method.enabled ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-slate-950 text-white hover:bg-slate-800"}`}
                  >
                    {busy ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                    {busy
                      ? "ZAPISYWANIE..."
                      : method.enabled
                        ? "WYŁĄCZ NOWE PŁATNOŚCI"
                        : canEnable
                          ? "WŁĄCZ STRIPE"
                          : "BRAK KONFIGURACJI"}
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
