"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react"

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

      window.location.href = session?.user?.role === "ADMIN" ? "/admin" : "/"
    } catch {
      setError("Logowanie jest chwilowo niedostępne. Spróbuj ponownie za moment.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-72px)] bg-white dark:bg-[#0c0c0c] lg:grid-cols-[1fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#102033] p-12 text-white lg:flex lg:items-center xl:p-20">
        <div className="absolute -right-32 -top-28 h-[520px] w-[520px] rounded-full bg-blue-500/25 blur-[120px]" />
        <div className="relative mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-xl shadow-primary/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <strong className="block text-sm tracking-tight">CEL-TRONICS</strong>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Platforma B2B
              </span>
            </div>
          </div>

          <span className="mt-20 block text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
            Strefa partnera
          </span>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.03] tracking-[-0.045em] xl:text-6xl">
            Katalog, oferty i obsługa B2B w jednym miejscu.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-300">
            Zaloguj się do platformy CEL-TRONICS, aby korzystać z indywidualnych
            warunków handlowych, katalogu produktów i narzędzi przygotowanych dla partnerów.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <LockKeyhole className="h-5 w-5 text-blue-300" />
              <strong className="mt-4 block">Katalog i ceny</strong>
              <span className="mt-1 block text-sm text-slate-400">
                dane dostępne po autoryzacji
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <KeyRound className="h-5 w-5 text-blue-300" />
              <strong className="mt-4 block">Oferty i obsługa</strong>
              <span className="mt-1 block text-sm text-slate-400">
                narzędzia dla partnerów B2B
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-[460px]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć na stronę główną
          </Link>

          <h2 className="mt-12 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Logowanie B2B
          </h2>
          <p className="mt-3 text-base font-medium leading-7 text-muted-foreground">
            Użyj danych przypisanych do Twojego konta partnera.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-7 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm font-semibold text-red-600 dark:text-red-400"
            >
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Adres e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="partner@firma.pl"
                  className="h-14 w-full rounded-xl border border-black/10 bg-black/[0.025] pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Hasło
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="h-14 w-full rounded-xl border border-black/10 bg-black/[0.025] pl-12 pr-4 text-sm font-semibold outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-white/[0.04]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-sm font-extrabold text-white shadow-xl shadow-primary/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
              {loading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </form>

          <div className="mt-8 border-t border-black/5 pt-6 text-sm font-medium leading-6 text-muted-foreground dark:border-white/10">
            <strong className="text-foreground">Nie masz dostępu?</strong>
            <p className="mt-2">
              Skontaktuj się z CEL-TRONICS, jeśli potrzebujesz pomocy z logowaniem, albo złóż wniosek o nowe konto partnera.
            </p>
            <Link
              href="/rejestracja"
              className="mt-4 inline-flex items-center gap-2 font-extrabold text-primary hover:underline"
            >
              Złóż wniosek o konto B2B
            </Link>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-bold">
              <a href="tel:+48256336800" className="text-primary hover:underline">25 633 68 00</a>
              <a href="mailto:serwis@celtronics.pl" className="text-primary hover:underline">
                serwis@celtronics.pl
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
