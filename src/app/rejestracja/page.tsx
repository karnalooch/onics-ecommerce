"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { PartnerRegistrationForm, type PartnerRegistrationData } from "./_components/PartnerRegistrationForm"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"

function useRegistration() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const pending = useRef(false)
  async function submit(data: PartnerRegistrationData) {
    if (pending.current) return
    pending.current = true; setLoading(true); setError("")
    try {
      const response = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "Nie udało się wysłać zgłoszenia. Spróbuj ponownie."
        setError(message); return
      }
      if (response.status !== 202 || !result || typeof result !== "object" || !("success" in result) || result.success !== true) throw new Error("Unexpected response")
      setSuccess(true)
    } catch { setError("Nie udało się połączyć z serwisem rejestracji. Spróbuj ponownie za moment.") }
    finally { pending.current = false; setLoading(false) }
  }
  return { error, success, loading, submit }
}
function RegistrationReceived() {
  return <section className={p.success}><h1>Zgłoszenie przyjęte do obsługi</h1><p>Dziękujemy. Przesłane dane zostaną obsłużone zgodnie ze stanem konta. Ten komunikat nie potwierdza utworzenia nowego konta ani aktywacji dostępu.</p><p>Ceny i funkcje partnera są dostępne dopiero po weryfikacji przez CEL-TRONICS.</p><Link href="/logowanie" className={s.primaryAction}>Przejdź do logowania</Link></section>
}
export default function RegisterPage() {
  const { error, success, loading, submit } = useRegistration()
  if (success) return <div className={p.page}><RegistrationReceived /></div>
  return <div className={p.page}>
    <PublicPageHeading eyebrow="CEL-TRONICS · strefa partnera" title="Załóż konto firmowe">Prześlij dane firmy do weryfikacji. Dostęp do cen, zamówień i obsługi serwisowej przyznajemy po zatwierdzeniu konta — nie automatycznie po wypełnieniu formularza.</PublicPageHeading>
    <div className={p.split}><section className={p.authPanel} aria-label="Zgłoszenie firmy">{error && <p role="alert" className={p.error}>{error}</p>}<PartnerRegistrationForm onSubmit={submit} loading={loading} /></section><aside className={p.aside}><h2>Co dalej?</h2><ol className={p.checklist}><li>Sprawdzimy przesłane dane firmy.</li><li>Po zatwierdzeniu konto uzyska właściwe uprawnienia.</li><li>Warunki handlowe pozostaną przypisane do Twojej firmy.</li></ol><p>Masz już konto?</p><Link href="/logowanie">Zaloguj się do strefy partnera CEL-TRONICS</Link><Link href="/kontakt">Pomoc z dostępem</Link></aside></div>
  </div>
}
