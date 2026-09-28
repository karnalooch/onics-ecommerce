"use client"

import Image from "next/image"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Nie udało się zalogować. Sprawdź adres e-mail i hasło.")
        return
      }

      const sessionResponse = await fetch("/api/auth/session")
      const session = await sessionResponse.json()

      window.location.href =
        session?.user?.role === "ADMIN" ? "/admin" : "/"
    } catch {
      setError(
        "Logowanie jest chwilowo niedostępne. Spróbuj ponownie za moment."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f2f2ef] px-5 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[540px]">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Wróć do CEL-TRONICS">
            <Image
              src="/assets/logo.svg"
              alt="CEL-TRONICS"
              width={210}
              height={42}
              priority
              className="h-auto w-[190px] sm:w-[210px]"
            />
          </Link>
        </div>

        <main className="rounded-2xl border border-[#dedfdf] bg-white p-6 shadow-[0_18px_45px_rgba(18,24,32,0.06)] sm:p-9">
          <p className="text-[15px] font-semibold text-primary">
            CEL-TRONICS · strefa partnera
          </p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.12] tracking-[-0.025em] text-slate-950 sm:text-[38px]">
            Zaloguj się do konta firmy
          </h1>
          <p className="mt-4 text-[17px] leading-7 text-slate-600">
            Katalog z cenami Twojej firmy, zamówienia, zapytania i obsługa serwisowa w jednym miejscu.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] leading-6 text-red-800"
            >
              {error}
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-base font-medium text-slate-900">
                Adres e-mail
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="partner@firma.pl"
                className="h-13 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none transition focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-base font-medium text-slate-900">
                Hasło
              </span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="h-13 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none transition focus:border-primary"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white transition hover:bg-[#a9161c] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {loading ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>

          <div className="mt-8 border-t border-[#e2e3e3] pt-6">
            <p className="text-base leading-7 text-slate-600">
              Nie masz jeszcze dostępu firmowego?
            </p>
            <Link
              href="/rejestracja"
              className="mt-2 inline-flex text-base font-semibold text-primary hover:underline"
            >
              Załóż konto partnera
            </Link>
          </div>
        </main>

        <div className="mt-6 text-center text-sm leading-6 text-slate-600">
          Pomoc z kontem:{" "}
          <a href="tel:+48256336800" className="font-semibold text-slate-900 hover:text-primary">
            25 633 68 00
          </a>
          {" · "}
          <a href="mailto:serwis@celtronics.pl" className="font-semibold text-slate-900 hover:text-primary">
            serwis@celtronics.pl
          </a>
        </div>
      </div>
    </div>
  )
}
