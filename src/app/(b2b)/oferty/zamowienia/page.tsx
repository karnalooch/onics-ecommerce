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
      tone: "warning" as const,
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
      tone: "danger" as const,
    }
  }

  if (order.status === "RETURNED") {
    return {
      label: "Zwrócone",
      detail: "Proces zwrotu został zakończony.",
      icon: RotateCcw,
      tone: "warning" as const,
    }
  }

  if (order.status === "INQUIRY") {
    return {
      label: "Zapytanie handlowe",
      detail: "Oczekuje na odpowiedź zespołu handlowego.",
      icon: MessageSquare,
      tone: "neutral" as const,
    }
  }

  if (order.status === "SHIPPED") {
    return {
      label: "Wysłane",
      detail: "Przesyłka została przekazana do realizacji.",
      icon: Truck,
      tone: "success" as const,
    }
  }

  return {
    label: "Potwierdzone",
    detail: "Zamówienie zostało zaakceptowane do realizacji.",
    icon: ShieldCheck,
    tone: "success" as const,
  }
}

const toneClass = {
  success: "border-[#b8d7c7] bg-[#f2f8f5] text-[#11603b]",
  warning: "border-[#e4cf9d] bg-[#fff9e8] text-[#6b4f11]",
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-[#d9dbdc] bg-[#f7f7f4] text-slate-700",
} as const

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
    <div className="mx-auto max-w-[1180px]">
      <header className="border-b border-[#d9dbdc] pb-7">
        <p className="text-base font-semibold text-primary">Realizacja</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
          Zamówienia
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Status realizacji, płatność, przewidywany termin oraz pozycje każdego zamówienia.
        </p>
      </header>

      {error ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-[15px] text-red-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 flex min-h-52 flex-col items-center justify-center border border-dashed border-[#cfd2d4] bg-white p-8 text-center">
          <Package className="h-7 w-7 text-slate-400" />
          <div className="mt-3 text-lg font-semibold text-slate-950">Brak zamówień</div>
          <p className="mt-2 max-w-md text-base leading-7 text-slate-600">
            Zamówienia i zapytania utworzone z katalogu pojawią się tutaj.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {orders.map((order) => {
            const status = statusMeta(order)
            const StatusIcon = status.icon

            return (
              <article
                key={order.id}
                className="overflow-hidden border border-[#d9dbdc] bg-white"
              >
                <header className="grid gap-3 border-b border-[#d9dbdc] bg-[#fafaf8] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <div className="font-mono text-sm font-semibold text-slate-950">
                      #{order.id}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {order.orderType === "ORDER" ? "Zamówienie" : "Zapytanie"} ·{" "}
                      {new Date(order.createdAt).toLocaleString("pl-PL")}
                    </div>
                  </div>

                  <div
                    className={
                      "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold " +
                      toneClass[status.tone]
                    }
                  >
                    <StatusIcon className="h-4 w-4" />
                    {status.label}
                  </div>
                </header>

                <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
                  <section>
                    <h2 className="text-base font-semibold text-slate-950">Pozycje</h2>
                    <div className="mt-3 border border-[#d9dbdc]">
                      {(order.items || []).map((item, index) => (
                        <div
                          key={item.id || item.sku || String(index)}
                          className="grid gap-2 border-b border-[#e0e1e1] px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_100px_130px] sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium text-slate-950">
                              {item.name || item.sku || "Produkt"}
                            </div>
                            <div className="mt-1 font-mono text-xs text-slate-500">
                              {item.sku || "brak SKU"}
                            </div>
                          </div>
                          <div className="font-mono text-sm text-slate-700">
                            × {item.quantity}
                          </div>
                          <div className="text-right font-mono text-sm font-semibold text-slate-950">
                            {formatMoney(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <aside className="space-y-4">
                    <div className={"rounded-lg border p-4 " + toneClass[status.tone]}>
                      <div className="text-base font-semibold">{status.label}</div>
                      <p className="mt-2 text-[15px] leading-6">{status.detail}</p>
                      {order.estimatedDeliveryDays ? (
                        <div className="mt-3 flex items-center gap-2 text-[15px]">
                          <Truck className="h-4 w-4" />
                          Termin: około {order.estimatedDeliveryDays} dni roboczych
                        </div>
                      ) : null}
                    </div>

                    {order.paymentProvider === "BANK_TRANSFER" &&
                    order.bankTransferIban ? (
                      <div className="rounded-lg border border-[#cfd7e6] bg-[#f5f8fc] p-4 text-[15px] text-slate-800">
                        <div className="flex items-center gap-2 font-semibold text-slate-950">
                          <Landmark className="h-4 w-4" />
                          Przelew bankowy
                        </div>
                        <dl className="mt-3 space-y-3">
                          <div>
                            <dt className="text-xs text-slate-500">Odbiorca</dt>
                            <dd className="mt-1">{order.bankTransferRecipient || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">IBAN</dt>
                            <dd className="mt-1 break-all font-mono">
                              {order.bankTransferIban}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Tytuł</dt>
                            <dd className="mt-1 font-mono">
                              {order.bankTransferReference || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Kwota</dt>
                            <dd className="mt-1 font-semibold">
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

                    <div className="border border-[#d9dbdc] p-4">
                      <div className="flex justify-between gap-3 text-sm text-slate-500">
                        <span>Wartość bazowa</span>
                        <span className="font-mono line-through">
                          {formatMoney(order.totalPriceOrig)}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between gap-3 text-base font-semibold text-slate-950">
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
