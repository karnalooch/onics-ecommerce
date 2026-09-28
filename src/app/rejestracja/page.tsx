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
      <div className="min-h-[calc(100vh-68px)] bg-[#f6f6f3] px-5 py-14 sm:px-7">
        <div className="mx-auto max-w-[620px] rounded-xl border border-[#cfd8d2] bg-white p-7 sm:p-9">
          <CheckCircle2 className="h-8 w-8 text-[#16794b]" />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
            Zgłoszenie wysłane do CEL-TRONICS
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Dane firmy trafiły do weryfikacji. Po aktywacji konta otrzymasz
            dostęp do strefy partnera i przypisanych warunków handlowych.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Przechodzimy do logowania…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f6f6f3] px-5 py-12 sm:px-7 lg:py-16">
      <div className="mx-auto max-w-[1040px]">
        <header className="grid gap-6 border-b border-[#d9dbdc] pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="text-base font-semibold text-primary">CEL-TRONICS · strefa partnera</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-5xl">
              Załóż konto firmowe
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Zgłoszenie tworzy dostęp dla firmy. Po weryfikacji konta udostępniamy
              ceny, katalog, zamówienia i obsługę serwisową przypisaną do partnera.
            </p>
          </div>

          <div className="border-l-2 border-primary pl-5 text-sm leading-6 text-slate-600">
            <strong className="block text-base font-semibold text-slate-950">
              Dostęp nie jest aktywowany automatycznie.
            </strong>
            Dane firmy sprawdza zespół CEL-TRONICS przed udostępnieniem warunków handlowych.
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] leading-6 text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-7 border border-[#d9dbdc] bg-white">
          <PartnerRegistrationForm
            onSubmit={handleRegister}
            loading={loading}
          />
        </div>

        <p className="mt-5 text-[15px] text-slate-600">
          Masz już konto?{" "}
          <Link
            href="/logowanie"
            className="font-semibold text-primary hover:underline"
          >
            Zaloguj się do strefy partnera CEL-TRONICS
          </Link>
        </p>
      </div>
    </div>
  )
}
