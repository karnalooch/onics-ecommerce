"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CreditCard,
  History,
  Power,
  RefreshCcw,
  ShieldCheck,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"

type PaymentControl = {
  enabled: boolean
  state: "ready" | "disabled" | "maintenance"
  maintenanceMessage: string | null
  updatedAt: string | null
}

type PaymentAuditEntry = {
  id: string
  createdAt: string
  target: string
  operation: "SETTING_CHANGE" | "EMERGENCY_SHUTDOWN"
  actor: {
    id: string | null
    email: string | null
    name: string | null
  }
  previousEnabled: boolean
  nextEnabled: boolean
  previousMaintenanceMessage: string | null
  nextMaintenanceMessage: string | null
  previousDisplayName: string | null
  nextDisplayName: string | null
  previousDisplayOrder: number | null
  nextDisplayOrder: number | null
}

type PaymentMethod = {
  id: string
  name: string
  enabled: boolean
  configured: boolean
  webhookConfigured: boolean
  displayOrder: number
  maintenanceMessage: string | null
  kind: "REDIRECT" | "MANUAL"
  state: "ready" | "misconfigured" | "disabled" | "maintenance"
  configurationIssues: string[]
  capabilities: {
    checkout: boolean
    webhook: boolean
    cancel: boolean
    refund: boolean
    reconcile: boolean
    rma: boolean
    manualSettlement: boolean
  }
  available: boolean
  updatedAt: string | null
  operations: {
    totalOrders: number
    ordersRequiringAttention: number
    pendingPayments: number
    pendingRefunds: number
    failedRefunds: number
    openReturns: number
    lastReconciledAt: string | null
    lastErrorAt: string | null
    lastOperationOutcome: "SUCCESS" | "PARTIAL" | "FAILED" | null
    lastOperationProcessed: number
    lastOperationFailed: number
    lastOperationManualReview: number
    actionCounts: Record<string, number>
  }
}

const CONFIGURATION_ISSUE_LABELS: Record<string, string> = {
  CREDENTIALS_MISSING: "brak danych uwierzytelniających",
  WEBHOOK_SECRET_MISSING: "brak konfiguracji webhooka",
  PUBLIC_APP_URL_INVALID: "nieprawidłowy publiczny URL aplikacji",
  RECIPIENT_MISSING: "brak odbiorcy płatności",
  ACCOUNT_NUMBER_INVALID: "nieprawidłowy numer rachunku",
}

const PROVIDER_STATE_LABELS: Record<PaymentMethod["state"], string> = {
  ready: "GOTOWY",
  misconfigured: "BŁĘDNA KONFIGURACJA",
  disabled: "WYŁĄCZONY",
  maintenance: "MAINTENANCE",
}

export default function AdminPaymentsPage() {
  const [control, setControl] = useState<PaymentControl | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [audit, setAudit] = useState<PaymentAuditEntry[]>([])
  const [maintenanceMessage, setMaintenanceMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [emergencyRunning, setEmergencyRunning] = useState(false)
  const [reconciling, setReconciling] = useState(false)

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
      setControl(data?.control ?? null)
      setMaintenanceMessage(data?.control?.maintenanceMessage ?? "")
      setMethods(data?.methods ?? [])
      setAudit(data?.audit ?? [])
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

  const saveGlobalControl = async (nextEnabled: boolean) => {
    if (
      !nextEnabled &&
      !window.confirm(
        "Wyłączyć wszystkie nowe płatności online? Istniejące transakcje, webhooki, refundy i RMA nadal będą obsługiwane."
      )
    ) {
      return
    }

    setSaving("GLOBAL")
    try {
      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "GLOBAL",
          enabled: nextEnabled,
          maintenanceMessage: maintenanceMessage.trim() || null,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || "Nie udało się zmienić globalnego stanu płatności."
        )
      }

      setControl(data?.control ?? null)
      setMaintenanceMessage(data?.control?.maintenanceMessage ?? "")
      setMethods(data?.methods ?? [])
      setAudit(data?.audit ?? [])
      toast.success(
        nextEnabled
          ? "Nowe płatności online zostały włączone."
          : "Nowe płatności online zostały globalnie wyłączone."
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się zmienić globalnego stanu płatności."
      )
    } finally {
      setSaving(null)
    }
  }

  const runEmergencyShutdown = async () => {
    if (
      !window.confirm(
        "AWARYJNE WYŁĄCZENIE: nowe płatności zostaną zablokowane, a wszystkie bezpiecznie wygaszalne otwarte sesje Stripe zostaną anulowane i zwolnią rezerwacje magazynowe. Kontynuować?"
      )
    ) {
      return
    }

    const typed = window.prompt(
      'Aby potwierdzić operację, wpisz dokładnie: WYŁĄCZ'
    )
    if (typed !== "WYŁĄCZ") {
      toast.error("Awaryjne wyłączenie anulowane — niepoprawne potwierdzenie.")
      return
    }

    setEmergencyRunning(true)
    try {
      const response = await fetch(
        "/api/payment-methods/emergency-shutdown",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: "EMERGENCY_SHUTDOWN",
            maintenanceMessage:
              maintenanceMessage.trim() ||
              "Płatności online zostały tymczasowo wyłączone przez administratora.",
          }),
        }
      )
      const data = await response.json().catch(() => null)

      if (!response.ok && response.status !== 207) {
        throw new Error(
          data?.error || "Nie udało się wykonać awaryjnego wyłączenia."
        )
      }

      const counts = data?.counts ?? {}
      const cancelled =
        Number(counts.cancelled ?? 0) +
        Number(counts["already-expired"] ?? 0)
      const unresolved =
        Number(counts.failed ?? 0) +
        Number(counts.changed ?? 0) +
        Number(counts["skipped-finalizing"] ?? 0)

      if (unresolved > 0) {
        toast.warning(
          `Płatności wyłączone. Zamknięto ${cancelled} sesji; ${unresolved} wymaga ponownej weryfikacji.`
        )
      } else {
        toast.success(
          `Awaryjne wyłączenie zakończone. Zamknięto ${cancelled} otwartych sesji Stripe.`
        )
      }

      await loadMethods()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się wykonać awaryjnego wyłączenia."
      )
      await loadMethods()
    } finally {
      setEmergencyRunning(false)
    }
  }

  const reconcileProvider = async (method: PaymentMethod) => {
    setReconciling(true)
    try {
      const response = await fetch("/api/payment-methods/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: method.id }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok && response.status !== 207) {
        throw new Error(
          data?.error || `Nie udało się zsynchronizować ${method.name}.`
        )
      }

      const summary = data?.summary ?? {}
      const updated = Number(summary.UPDATED ?? 0)
      const review = Number(summary.MANUAL_REVIEW ?? 0)
      const failed = Number(summary.FAILED ?? 0)
      const unchanged = Number(summary.UNCHANGED ?? 0)

      if (failed > 0 || review > 0) {
        toast.warning(
          `${method.name}: zaktualizowano ${updated}, bez zmian ${unchanged}, review ${review}, błędy ${failed}.`
        )
      } else {
        toast.success(
          `${method.name} zsynchronizowany: zaktualizowano ${updated}, bez zmian ${unchanged}.`
        )
      }

      await loadMethods()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Nie udało się zsynchronizować ${method.name}.`
      )
    } finally {
      setReconciling(false)
    }
  }

  const updateMethodDraft = (
    id: PaymentMethod["id"],
    patch: Partial<Pick<PaymentMethod, "name" | "displayOrder" | "maintenanceMessage">>
  ) => {
    setMethods((current) =>
      current.map((method) =>
        method.id === id ? { ...method, ...patch } : method
      )
    )
  }

  const saveMethodSettings = async (method: PaymentMethod) => {
    setSaving(`${method.id}:settings`)
    try {
      const response = await fetch("/api/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: method.id,
          displayName: method.name,
          displayOrder: method.displayOrder,
          maintenanceMessage: method.maintenanceMessage?.trim() || null,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error || "Nie udało się zapisać ustawień dostawcy."
        )
      }

      setMethods(data?.methods ?? [])
      setAudit(data?.audit ?? [])
      toast.success(`Zapisano ustawienia: ${method.name}.`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać ustawień dostawcy."
      )
    } finally {
      setSaving(null)
    }
  }

  const toggleMethod = async (method: PaymentMethod) => {
    const nextEnabled = !method.enabled

    if (
      !nextEnabled &&
      !window.confirm(
        `Wyłączyć ${method.name} dla nowych płatności? Istniejące transakcje i historyczne zamówienia pozostaną dostępne.`
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
      setAudit(data?.audit ?? [])
      toast.success(
        nextEnabled
          ? `${method.name} włączony dla nowych płatności.`
          : `${method.name} wyłączony dla nowych płatności.`
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

      {!loading && control && (
        <section className="bg-slate-950 text-white shadow-sm">
          <div className="p-8 grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Power className={`w-6 h-6 ${control.enabled ? "text-green-400" : "text-red-300"}`} />
                <h2 className="text-xl font-black uppercase italic tracking-tight">
                  Główny przełącznik płatności online
                </h2>
                <span
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                    control.enabled
                      ? "bg-green-400/15 text-green-300"
                      : "bg-red-400/15 text-red-300"
                  }`}
                >
                  {control.enabled ? "ONLINE" : "MAINTENANCE"}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                Ten przełącznik blokuje tworzenie wszystkich nowych płatności
                online niezależnie od ustawień pojedynczych operatorów. Nie
                zatrzymuje obsługi istniejących transakcji.
              </p>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Komunikat dla klienta podczas przerwy
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(event) =>
                    setMaintenanceMessage(event.target.value.slice(0, 160))
                  }
                  rows={3}
                  maxLength={160}
                  placeholder="Płatności online są chwilowo niedostępne. Spróbuj ponownie później."
                  className="w-full bg-white/5 border border-white/15 px-4 py-3 text-sm text-white outline-none focus:border-primary resize-none"
                />
                <div className="text-right text-[9px] font-black text-slate-500">
                  {maintenanceMessage.length}/160
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => saveGlobalControl(!control.enabled)}
                disabled={saving !== null}
                className={`h-14 px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  control.enabled
                    ? "bg-red-500/15 text-red-200 border border-red-400/30 hover:bg-red-500/25"
                    : "bg-green-500 text-slate-950 hover:bg-green-400"
                }`}
              >
                {saving === "GLOBAL" ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                {control.enabled
                  ? "WYŁĄCZ WSZYSTKIE PŁATNOŚCI"
                  : "WŁĄCZ PŁATNOŚCI ONLINE"}
              </button>

              <button
                onClick={() => saveGlobalControl(control.enabled)}
                disabled={saving !== null}
                className="h-11 px-6 border border-white/15 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:border-white/40 disabled:opacity-40"
              >
                ZAPISZ KOMUNIKAT
              </button>
            </div>
          </div>
        </section>
      )}

      {!loading && control && (
        <section className="border-2 border-red-200 bg-red-50">
          <div className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h2 className="text-lg font-black uppercase tracking-tight text-red-900">
                  Awaryjne wyłączenie płatności
                </h2>
              </div>
              <p className="text-sm text-red-800/80 mt-3 leading-relaxed">
                Blokuje nowe checkouty i próbuje wygasić wszystkie otwarte,
                jeszcze nieopłacone sesje Stripe. Opłacone, wysłane i
                finalizujące się transakcje są pomijane. Pomyślnie wygaszone
                sesje zwalniają rezerwacje magazynowe.
              </p>
            </div>

            <button
              onClick={runEmergencyShutdown}
              disabled={saving !== null || emergencyRunning}
              className="min-w-[300px] h-14 px-6 bg-red-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {emergencyRunning ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {emergencyRunning
                ? "WYGASZANIE_SESJI..."
                : "AWARYJNIE WYŁĄCZ I WYGASZ SESJE"}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="h-64 border border-slate-100 bg-white flex items-center justify-center">
          <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {methods.map((method) => {
            const canEnable = method.configured
            const busy =
              saving === method.id || saving === `${method.id}:settings`

            return (
              <section
                key={method.id}
                className="bg-white border border-slate-100 shadow-sm"
              >
                <div className="p-8 grid gap-8 xl:grid-cols-[1fr_320px]">
                  <div>
                    <div className="flex items-start gap-5">
                      <div
                        className={`w-12 h-12 flex items-center justify-center ${
                          method.enabled
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <CreditCard className="w-6 h-6" />
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-950">
                            {method.name}
                          </h2>
                          <span
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                              method.state === "ready"
                                ? "bg-green-100 text-green-700"
                                : method.state === "misconfigured"
                                  ? "bg-amber-100 text-amber-700"
                                  : method.state === "maintenance"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {PROVIDER_STATE_LABELS[method.state]}
                          </span>
                          <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                            {method.kind === "REDIRECT" ? "BRAMKA" : "MANUAL"}
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

                          {method.capabilities.webhook && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                              <Webhook
                                className={`w-4 h-4 ${
                                  method.webhookConfigured
                                    ? "text-green-600"
                                    : "text-amber-500"
                                }`}
                              />
                              <span className="text-slate-500">
                                Webhook:{" "}
                                {method.webhookConfigured
                                  ? "OK"
                                  : "NIESKONFIGUROWANY"}
                              </span>
                            </div>
                          )}
                        </div>

                        {method.configurationIssues.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {method.configurationIssues.map((issue) => (
                              <span
                                key={issue}
                                className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100"
                              >
                                {CONFIGURATION_ISSUE_LABELS[issue] ?? issue}
                              </span>
                            ))}
                          </div>
                        )}

                        {method.updatedAt && (
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4">
                            Ostatnia zmiana:{" "}
                            {new Date(method.updatedAt).toLocaleString("pl-PL")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mt-6">
                      {[
                        ["DO OBSŁUGI", method.operations.ordersRequiringAttention],
                        ["PŁATNOŚĆ OCZEKUJE", method.operations.pendingPayments],
                        ["REFUND W TOKU", method.operations.pendingRefunds],
                        ["OTWARTE RMA", method.operations.openReturns],
                        ["BŁĘDY REFUNDU", method.operations.failedRefunds],
                        ["ZAMÓWIENIA", method.operations.totalOrders],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="border border-slate-100 bg-slate-50 px-3 py-3"
                        >
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            {label}
                          </div>
                          <div className="text-xl font-black tabular-nums text-slate-950 mt-1">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {(method.operations.lastReconciledAt ||
                      method.operations.lastErrorAt ||
                      method.operations.ordersRequiringAttention > 0) && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {method.operations.lastReconciledAt && (
                          <span>
                            Ostatni reconcile:{" "}
                            {new Date(
                              method.operations.lastReconciledAt
                            ).toLocaleString("pl-PL")}
                            {method.operations.lastOperationOutcome
                              ? ` · ${method.operations.lastOperationOutcome} · processed ${method.operations.lastOperationProcessed} · failed ${method.operations.lastOperationFailed} · review ${method.operations.lastOperationManualReview}`
                              : ""}
                          </span>
                        )}
                        {method.operations.lastErrorAt && (
                          <span className="text-red-600">
                            Ostatni błąd:{" "}
                            {new Date(
                              method.operations.lastErrorAt
                            ).toLocaleString("pl-PL")}
                          </span>
                        )}
                        {method.operations.ordersRequiringAttention > 0 && (
                          <a
                            href="/admin/orders"
                            className="text-primary hover:underline"
                          >
                            OBSŁUŻ ZAMÓWIENIA →
                          </a>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-[1fr_140px] mt-7">
                      <label className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                          Nazwa dla klienta
                        </span>
                        <input
                          value={method.name}
                          maxLength={80}
                          onChange={(event) =>
                            updateMethodDraft(method.id, {
                              name: event.target.value.slice(0, 80),
                            })
                          }
                          className="w-full h-11 border border-slate-200 px-3 text-sm outline-none focus:border-slate-950"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                          Kolejność
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={method.displayOrder}
                          onChange={(event) =>
                            updateMethodDraft(method.id, {
                              displayOrder: Math.max(
                                0,
                                Math.min(999, Number(event.target.value) || 0)
                              ),
                            })
                          }
                          className="w-full h-11 border border-slate-200 px-3 text-sm outline-none focus:border-slate-950"
                        />
                      </label>
                    </div>

                    <label className="space-y-2 block mt-4">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Komunikat niedostępności
                      </span>
                      <textarea
                        value={method.maintenanceMessage ?? ""}
                        rows={2}
                        maxLength={160}
                        onChange={(event) =>
                          updateMethodDraft(method.id, {
                            maintenanceMessage:
                              event.target.value.slice(0, 160),
                          })
                        }
                        placeholder="Opcjonalny komunikat wyświetlany klientowi, gdy metoda jest niedostępna."
                        className="w-full border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-950 resize-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col justify-end gap-3">
                    <button
                      onClick={() => saveMethodSettings(method)}
                      disabled={busy}
                      className="h-11 px-6 border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:border-slate-950 disabled:opacity-40"
                    >
                      {saving === `${method.id}:settings`
                        ? "ZAPISYWANIE..."
                        : "ZAPISZ USTAWIENIA"}
                    </button>

                    <button
                      onClick={() => toggleMethod(method)}
                      disabled={busy || (!method.enabled && !canEnable)}
                      className={`h-14 px-6 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        method.enabled
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-slate-950 text-white hover:bg-slate-800"
                      }`}
                    >
                      {saving === method.id ? (
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                      {saving === method.id
                        ? "ZAPISYWANIE..."
                        : method.enabled
                          ? "WYŁĄCZ NOWE PŁATNOŚCI"
                          : canEnable
                            ? `WŁĄCZ ${method.name}`
                            : "BRAK KONFIGURACJI"}
                    </button>

                    {method.capabilities.reconcile && (
                      <button
                        onClick={() => reconcileProvider(method)}
                        disabled={
                          reconciling ||
                          saving !== null ||
                          emergencyRunning ||
                          !method.configured
                        }
                        className="h-11 px-6 border border-slate-200 text-slate-600 bg-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:border-slate-950 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RefreshCcw
                          className={`w-4 h-4 ${
                            reconciling ? "animate-spin" : ""
                          }`}
                        />
                        {reconciling
                          ? "SYNCHRONIZACJA..."
                          : `SYNCHRONIZUJ ${method.name}`}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {!loading && audit.length > 0 && (
        <section className="bg-white border border-slate-100 shadow-sm">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-950">
                  Historia zmian płatności
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Ostatnie {audit.length} zdarzeń
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {audit.map((entry) => {
              const actor =
                entry.actor.name ||
                entry.actor.email ||
                entry.actor.id ||
                "ADMIN"
              const enabledChanged =
                entry.previousEnabled !== entry.nextEnabled
              const messageChanged =
                entry.previousMaintenanceMessage !==
                entry.nextMaintenanceMessage
              const presentationChanged =
                entry.previousDisplayName !== entry.nextDisplayName ||
                entry.previousDisplayOrder !== entry.nextDisplayOrder
              const targetName =
                entry.target === "GLOBAL"
                  ? "Wszystkie płatności"
                  : methods.find((method) => method.id === entry.target)?.name ??
                    entry.target

              return (
                <div
                  key={entry.id}
                  className="px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 w-2.5 h-2.5 rounded-full ${
                        entry.nextEnabled ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-950">
                          {targetName}
                        </span>
                        {entry.operation === "EMERGENCY_SHUTDOWN" && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-red-700 text-white">
                            AWARYJNE_WYŁĄCZENIE
                          </span>
                        )}
                        {enabledChanged && (
                          <span
                            className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                              entry.nextEnabled
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {entry.nextEnabled ? "WŁĄCZONO" : "WYŁĄCZONO"}
                          </span>
                        )}
                        {messageChanged && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-700">
                            KOMUNIKAT_ZMIENIONY
                          </span>
                        )}
                        {presentationChanged && (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-blue-100 text-blue-700">
                            PREZENTACJA_ZMIENIONA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Operator: <span className="font-bold">{actor}</span>
                      </p>
                      {messageChanged && entry.nextMaintenanceMessage && (
                        <p className="text-xs text-slate-400 mt-2 italic">
                          „{entry.nextMaintenanceMessage}”
                        </p>
                      )}
                    </div>
                  </div>

                  <time className="text-[10px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                    {new Date(entry.createdAt).toLocaleString("pl-PL")}
                  </time>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
