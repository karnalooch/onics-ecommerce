"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import { OnboardingMissionControl, type OnboardingFormData } from "./_components/OnboardingMissionControl"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (data: OnboardingFormData) => {
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
        setError(result.error || "Nie udało się wysłać zgłoszenia. Sprawdź dane i spróbuj ponownie.")
        return
      }

      setSuccess(true)
      setTimeout(() => router.push("/logowanie"), 2500)
    } catch {
      setError("Nie udało się połączyć z serwisem rejestracji. Spróbuj ponownie za moment.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-lg rounded-[24px] border border-emerald-500/20 bg-white p-9 text-center shadow-xl dark:bg-white/[0.04]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Zgłoszenie zostało wysłane</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
            Dane firmy trafiły do weryfikacji. Po aktywacji konta będziesz mógł korzystać
            z platformy B2B.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Przechodzimy do logowania…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Konto partnera
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Rejestracja do platformy B2B
          </h1>
          <p className="mt-4 text-base font-medium leading-7 text-muted-foreground">
            Załóż konto firmowe, aby uzyskać dostęp do funkcji przygotowanych dla partnerów
            CEL-TRONICS. Zgłoszenie zostanie zweryfikowane przed aktywacją dostępu.
          </p>
        </div>

        {error && (
          <div role="alert" className="mx-auto mt-8 max-w-3xl rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-xl shadow-black/[0.04] dark:border-white/10 dark:bg-white/[0.04]">
          <OnboardingMissionControl onSubmit={handleRegister} loading={loading} />
        </div>

        <p className="mt-6 text-center text-sm font-medium text-muted-foreground">
          Masz już konto?{" "}
          <Link href="/logowanie" className="font-extrabold text-primary hover:underline">
            Zaloguj się do platformy B2B
          </Link>
        </p>
      </div>
    </div>
  )
}
