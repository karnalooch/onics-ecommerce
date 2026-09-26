"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Printer, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { COMPANY_PUBLIC } from "@/lib/company"
import { useCartStore } from "@/store/cartStore"

type OfferPreview = {
  reference: string
  issuedAt: string
  currency: "PLN"
  customer: {
    companyName: string | null
    nip: string | null
    email: string | null
  }
  items: Array<{
    id: string
    sku: string
    name: string
    quantity: number
    unitPriceNet: number
    lineTotalNet: number
  }>
  totalNet: number
}

export default function CartOfferPage() {
  const router = useRouter()
  const items = useCartStore((state) => state.items)
  const [mounted, setMounted] = useState(false)
  const [preview, setPreview] = useState<OfferPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (items.length === 0) {
      setLoading(false)
      setError("Koszyk jest pusty. Dodaj produkty przed przygotowaniem oferty.")
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch("/api/cart/offer-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        })),
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.error || "Nie udało się przygotować oferty.")
        }
        if (!cancelled) setPreview(data as OfferPreview)
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Nie udało się przygotować oferty."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [items, mounted])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Przygotowywanie aktualnej wyceny…
        </div>
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="container mx-auto max-w-2xl py-16 px-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-bold text-red-900">
            Nie można przygotować oferty
          </h1>
          <p className="mt-3 text-sm text-red-800">
            {error || "Nie udało się pobrać aktualnej wyceny."}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/koszyk")}
            className="mt-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Wróć do koszyka
          </Button>
        </div>
      </div>
    )
  }

  const issuedAt = new Date(preview.issuedAt)

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex max-w-5xl justify-between gap-3 print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/koszyk")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Wróć do koszyka
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Drukuj / Zapisz jako PDF
        </Button>
      </div>

      <article className="mx-auto max-w-5xl bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8 border-b pb-8">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Oferta cenowa B2B
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              {COMPANY_PUBLIC.shortName}
            </h1>
            <div className="mt-3 text-sm leading-6 text-slate-600">
              <div>{COMPANY_PUBLIC.name}</div>
              <div>{COMPANY_PUBLIC.addressLine1}</div>
              <div>{COMPANY_PUBLIC.addressLine2}</div>
              <div>{COMPANY_PUBLIC.email}</div>
              <div>{COMPANY_PUBLIC.phoneDisplay}</div>
              {COMPANY_PUBLIC.nip && <div>NIP: {COMPANY_PUBLIC.nip}</div>}
            </div>
          </div>

          <div className="min-w-[230px] text-right text-sm">
            <div className="font-mono font-bold text-slate-900">
              {preview.reference}
            </div>
            <div className="mt-2 text-slate-500">
              Data: {issuedAt.toLocaleDateString("pl-PL")}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 border-b py-7 md:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Odbiorca
            </div>
            <div className="mt-2 font-bold text-slate-900">
              {preview.customer.companyName || "Partner B2B"}
            </div>
            {preview.customer.nip && (
              <div className="mt-1 text-sm text-slate-600">
                NIP: {preview.customer.nip}
              </div>
            )}
            {preview.customer.email && (
              <div className="text-sm text-slate-600">
                {preview.customer.email}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 print:border print:bg-white">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                Ceny zostały ponownie wyliczone po stronie serwera na podstawie
                aktualnego katalogu i warunków konta B2B. Ten dokument nie
                rezerwuje stanu magazynowego.
              </p>
            </div>
          </div>
        </section>

        <section className="py-7">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-left">
                <th className="py-3 pr-4">Produkt</th>
                <th className="py-3 px-3 text-right">Ilość</th>
                <th className="py-3 px-3 text-right">Cena netto</th>
                <th className="py-3 pl-3 text-right">Wartość netto</th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item) => (
                <tr key={item.id} className="border-b align-top">
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      SKU: {item.sku}
                    </div>
                  </td>
                  <td className="py-4 px-3 text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-3 text-right tabular-nums">
                    {item.unitPriceNet.toFixed(2)} {preview.currency}
                  </td>
                  <td className="py-4 pl-3 text-right font-semibold tabular-nums">
                    {item.lineTotalNet.toFixed(2)} {preview.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-8 ml-auto max-w-sm border-t-2 border-slate-900 pt-4">
            <div className="flex items-end justify-between gap-6">
              <span className="font-semibold text-slate-600">Razem netto</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {preview.totalNet.toFixed(2)} {preview.currency}
              </span>
            </div>
          </div>
        </section>

        <footer className="border-t pt-6 text-xs leading-5 text-slate-500">
          <p>
            Wycena odzwierciedla ceny aktualne w chwili wygenerowania dokumentu.
            Dostępność, termin realizacji i finalne warunki są ponownie
            weryfikowane przy składaniu zamówienia.
          </p>
        </footer>
      </article>
    </main>
  )
}
