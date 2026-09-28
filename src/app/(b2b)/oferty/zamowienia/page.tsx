"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Clock,
  Landmark,
  Loader2,
  MessageSquare,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react"

type OrderItem = {
  id?: string
  sku?: string
  name?: string
  quantity: number
  price: number
}

type PartnerOrder = {
  id: string
  createdAt: string
  orderType?: string
  status: string
  paymentProvider?: string | null
  paymentStatus?: string | null
  bankTransferIban?: string | null
  bankTransferRecipient?: string | null
  bankTransferReference?: string | null
  bankTransferAmount?: number | null
  bankTransferCurrency?: string | null
  estimatedDeliveryDays?: number | null
  totalPriceOrig?: number | null
  totalPriceFinal?: number | null
  items?: OrderItem[]
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " zł"
}

function statusMeta(order: PartnerOrder) {
  if (order.status === "PENDING_VERIFICATION") {
    return {
      label: "Oczekuje na weryfikację",
      detail:
        order.paymentProvider === "BANK_TRANSFER" &&
        order.paymentStatus !== "PAID"
          ? "Najpierw oczekujemy na potwierdzenie wpływu przelewu."
          : "Warunki i termin dostawy wymagają potwierdzenia.",
      icon: Clock,
      className:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
    }
  }

  if (order.status === "CANCELLED") {
    return {
      label: "Anulowane",
      detail:
        order.paymentStatus === "REFUNDED"
          ? "Zwrot środków został potwierdzony."
          : "Zamówienie nie będzie realizowane.",
      icon: XCircle,
      className:
        "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
    }
  }

  if (order.status === "RETURNED") {
    return {
      label: "Zwrócone",
      detail: "Proces zwrotu został zakończony.",
      icon: RotateCcw,
      className:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
    }
  }

  if (order.status === "INQUIRY") {
    return {
      label: "Zapytanie handlowe",
      detail: "Oczekuje na odpowiedź zespołu handlowego.",
      icon: MessageSquare,
      className:
        "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-200",
    }
  }

  if (order.status === "SHIPPED") {
    return {
      label: "Wysłane",
      detail: "Przesyłka została przekazana do realizacji.",
      icon: Truck,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
    }
  }

  return {
    label: "Potwierdzone",
    detail: "Zamówienie zostało zaakceptowane do realizacji.",
    icon: ShieldCheck,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
  }
}

export default function B2BClientOrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadOrders = useCallback(async () => {
    setError("")
    try {
      const response = await fetch("/api/orders", { cache: "no-store" })
      const payload: unknown = await response.json().catch(() => [])

      if (!response.ok || !Array.isArray(payload)) {
        throw new Error("Nie udało się pobrać zamówień.")
      }

      setOrders(payload as PartnerOrder[])
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nie udało się pobrać zamówień."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOrders])

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Realizacja
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Zamówienia
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Status realizacji, płatności, terminy i pozycje zamówień.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#0f1216]">
          <Package className="h-6 w-6 text-slate-400" />
          <div className="mt-3 font-semibold">Brak zamówień</div>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Zamówienia i zapytania utworzone z katalogu pojawią się tutaj.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusMeta(order)
            const StatusIcon = status.icon

            return (
              <article
                key={order.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]"
              >
                <header className="grid gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="font-mono text-sm font-semibold">
                      #{order.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {order.orderType === "ORDER" ? "Zamówienie" : "Zapytanie"} ·{" "}
                      {new Date(order.createdAt).toLocaleString("pl-PL")}
                    </div>
                  </div>

                  <div
                    className={
                      "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold " +
                      status.className
                    }
                  >
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                  </div>
                </header>

                <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
                  <section>
                    <h2 className="text-sm font-semibold">Pozycje</h2>
                    <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {(order.items || []).map((item, index) => (
                        <div
                          key={item.id || item.sku || String(index)}
                          className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_100px_120px] sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {item.name || item.sku || "Produkt"}
                            </div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {item.sku || "brak SKU"}
                            </div>
                          </div>
                          <div className="font-mono text-sm">
                            × {item.quantity}
                          </div>
                          <div className="text-right font-mono text-sm font-semibold">
                            {formatMoney(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="text-sm font-semibold">{status.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {status.detail}
                      </p>
                      {order.estimatedDeliveryDays ? (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-slate-500" />
                          Termin: około {order.estimatedDeliveryDays} dni roboczych
                        </div>
                      ) : null}
                    </div>

                    {order.paymentProvider === "BANK_TRANSFER" &&
                    order.bankTransferIban ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                        <div className="flex items-center gap-2 font-semibold">
                          <Landmark className="h-4 w-4" />
                          Przelew bankowy
                        </div>
                        <dl className="mt-3 space-y-2">
                          <div>
                            <dt className="text-xs opacity-70">Odbiorca</dt>
                            <dd>{order.bankTransferRecipient || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs opacity-70">IBAN</dt>
                            <dd className="break-all font-mono">
                              {order.bankTransferIban}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs opacity-70">Tytuł</dt>
                            <dd className="font-mono">
                              {order.bankTransferReference || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs opacity-70">Kwota</dt>
                            <dd className="font-semibold">
                              {formatMoney(
                                order.bankTransferAmount ??
                                  order.totalPriceFinal
                              )}{" "}
                              {order.bankTransferCurrency || "PLN"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex justify-between gap-3 text-sm text-slate-500">
                        <span>Wartość bazowa</span>
                        <span className="font-mono line-through">
                          {formatMoney(order.totalPriceOrig)}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3 font-semibold">
                        <span>Wartość netto</span>
                        <span className="font-mono">
                          {formatMoney(order.totalPriceFinal)}
                        </span>
                      </div>
                    </div>
                  </aside>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
