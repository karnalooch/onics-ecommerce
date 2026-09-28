"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import {
  PartnerRegistrationForm,
  type PartnerRegistrationData,
} from "./_components/PartnerRegistrationForm"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (data: PartnerRegistrationData) => {
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(
          result.error ||
            "Nie udało się wysłać zgłoszenia. Sprawdź dane i spróbuj ponownie."
        )
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/logowanie"), 2500)
    } catch {
      setError(
        "Nie udało się połączyć z serwisem rejestracji. Spróbuj ponownie za moment."
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-white p-7 text-center dark:border-emerald-900 dark:bg-[#0f1216]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Zgłoszenie wysłane do CEL-TRONICS
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Dane firmy trafiły do weryfikacji. Po aktywacji konta otrzymasz
            dostęp do strefy partnera i przypisanych warunków handlowych.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Przechodzimy do logowania…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            CEL-TRONICS · strefa partnera
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Załóż konto firmowe
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Konto służy do obsługi cen, katalogu, zapytań i zamówień partnera.
            Dostęp aktywujemy po weryfikacji danych firmy.
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
          <PartnerRegistrationForm
            onSubmit={handleRegister}
            loading={loading}
          />
        </div>

        <p className="mt-5 text-sm text-slate-500">
          Masz już konto?{" "}
          <Link
            href="/logowanie"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Zaloguj się do strefy partnera CEL-TRONICS
          </Link>
        </p>
      </div>
    </div>
  )
}
