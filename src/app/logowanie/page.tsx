"use client"

import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRef, useState, type FormEvent } from "react"
import { ArrowUpRight } from "lucide-react"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import { companyContact } from "@/components/public/public-content"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"

function sessionDestination(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("user" in value)) return null
  const user = value.user
  if (!user || typeof user !== "object" || !("role" in user) || typeof user.role !== "string") return null
  return user.role === "ADMIN" ? "/admin" : "/"
}

function usePartnerLogin() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const pending = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const data = new FormData(event.currentTarget)
    pending.current = true; setLoading(true); setError("")
    try {
      const result = await signIn("credentials", { email: String(data.get("email") ?? ""), password: String(data.get("password") ?? ""), redirect: false })
      if (!result?.ok || result.error) { setError("Nie udało się zalogować. Sprawdź adres e-mail i hasło."); return }
      const response = await fetch("/api/auth/session", { cache: "no-store" })
      if (!response.ok) throw new Error("Session unavailable")
      const destination = sessionDestination(await response.json())
      if (!destination) throw new Error("Session unavailable")
      window.location.href = destination
    } catch { setError("Logowanie jest chwilowo niedostępne. Spróbuj ponownie za moment.") }
    finally { pending.current = false; setLoading(false) }
  }
  return { error, loading, submit }
}

function LoginForm() {
  const { error, loading, submit } = usePartnerLogin()
  const [showPassword, setShowPassword] = useState(false)
  return <section className={p.authPanel} aria-labelledby="login-form-title"><h2 id="login-form-title">Dane logowania</h2>
    {error && <p role="alert" className={p.error}>{error}</p>}
    <form className={p.form} onSubmit={submit} aria-busy={loading}>
      <label className={p.field} htmlFor="login-email"><span>Adres e-mail</span><input id="login-email" name="email" type="email" autoComplete="email" required disabled={loading} placeholder="partner@firma.pl" /></label>
      <label className={p.field} htmlFor="login-password"><span>Hasło</span><span className={p.passwordRow}><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={loading} /><button type="button" className={p.passwordToggle} aria-controls="login-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ukryj" : "Pokaż"}</button></span></label>
      <button type="submit" className={s.primaryAction} disabled={loading}>{loading ? "Logowanie…" : "Zaloguj się"}<ArrowUpRight size={20} aria-hidden="true" /></button>
    </form>
    <p className={p.note}>Nie masz dostępu firmowego? <Link href="/rejestracja" className={s.textAction}>Załóż konto partnera</Link></p>
  </section>
}

export default function LoginPage() {
  return <div className={p.page}><div className={p.authGrid}>
    <div><PublicPageHeading eyebrow="CEL-TRONICS · strefa partnera" title={<>Twoja firma.<br />Twoje warunki.</>}>Zaloguj się do konta firmy. Katalog z cenami partnera, zamówienia i obsługa serwisowa korzystają z uprawnień przypisanych do Twojego konta.</PublicPageHeading><p className={p.note}>Potrzebujesz pomocy z dostępem?<br /><a href={companyContact.telephoneHref} className={s.textAction}>{companyContact.phone}</a><br /><a href={companyContact.emailHref} className={s.textAction}>{companyContact.email}</a></p></div>
    <LoginForm />
  </div></div>
}
