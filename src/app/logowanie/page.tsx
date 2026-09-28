"use client"

import Image from "next/image"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react"

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
    <div className="grid min-h-[calc(100vh-72px)] bg-white dark:bg-[#0b0d10] lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden border-r border-slate-800 bg-[#111820] p-10 text-white lg:flex lg:items-center xl:p-16">
        <div className="mx-auto w-full max-w-xl">
          <div className="inline-flex rounded-md bg-white px-3 py-2">
            <Image
              src="/assets/logo.svg"
              alt="CEL-TRONICS"
              width={220}
              height={42}
              className="h-auto w-[220px]"
              priority
            />
          </div>

          <div className="mt-12 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Strefa partnera
          </div>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            Dostęp do katalogu, cen i obsługi CEL-TRONICS.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Jedno konto do katalogu urządzeń, zapytań, zamówień, serwisu i
            danych firmowych przypisanych do Twojej firmy.
          </p>

          <dl className="mt-10 divide-y divide-white/10 border-y border-white/10 text-sm">
            <div className="grid grid-cols-[150px_1fr] gap-4 py-4">
              <dt className="text-slate-400">Katalog</dt>
              <dd>urządzenia, ceny konta i dostępność</dd>
            </div>
            <div className="grid grid-cols-[150px_1fr] gap-4 py-4">
              <dt className="text-slate-400">Obsługa</dt>
              <dd>zapytania, zamówienia i terminy realizacji</dd>
            </div>
            <div className="grid grid-cols-[150px_1fr] gap-4 py-4">
              <dt className="text-slate-400">Serwis</dt>
              <dd>zgłoszenia RMA i status napraw</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-[460px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć do CEL-TRONICS
          </Link>

          <div className="mt-10 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            CEL-TRONICS · strefa partnera
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Zaloguj się
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Użyj danych przypisanych do konta Twojej firmy.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"
            >
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <label>
              <span className="mb-2 block text-sm font-semibold">
                Adres e-mail
              </span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="partner@firma.pl"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-transparent pl-10 pr-3 text-sm outline-none focus:border-slate-950 dark:border-slate-700 dark:focus:border-white"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-semibold">Hasło</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-12 w-full rounded-lg border border-slate-300 bg-transparent pl-10 pr-3 text-sm outline-none focus:border-slate-950 dark:border-slate-700 dark:focus:border-white"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500 dark:border-slate-800">
            <p>
              Potrzebujesz dostępu dla swojej firmy albo pomocy z kontem?
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              <Link
                href="/rejestracja"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Załóż konto partnera
              </Link>
              <a
                href="tel:+48256336800"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                25 633 68 00
              </a>
              <a
                href="mailto:serwis@celtronics.pl"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                serwis@celtronics.pl
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
