"use client"

import { useRef, useState, type FormEvent, type InputHTMLAttributes } from "react"
import { ArrowUpRight } from "lucide-react"
import { readRegistrationData, validateRegistrationData, type PartnerRegistrationData, type RegistrationErrors } from "./registration-data"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"
export type { PartnerRegistrationData } from "./registration-data"

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; name: keyof PartnerRegistrationData; error?: string; hint?: string }
function Field({ label, name, error, hint, ...input }: FieldProps) {
  return <label className={p.field} htmlFor={`register-${name}`}><span>{label}</span><input {...input} id={`register-${name}`} name={name} aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} />{hint && <span className={p.hint} id={`${name}-hint`}>{hint}</span>}{error && <span className={p.fieldError} id={`${name}-error`}>{error}</span>}</label>
}
function CompanyFields({ errors }: { errors: RegistrationErrors }) {
  return <div className={p.fieldGrid}>
    <Field name="nip" label="NIP" inputMode="numeric" autoComplete="off" required maxLength={20} error={errors.nip} hint="10 cyfr; możesz wkleić numer z myślnikami." />
    <Field name="companyName" label="Pełna nazwa firmy" autoComplete="organization" required maxLength={160} error={errors.companyName} />
    <Field name="phone" label="Telefon (opcjonalnie)" type="tel" autoComplete="tel" maxLength={50} error={errors.phone} />
    <Field name="address" label="Adres firmy (opcjonalnie)" autoComplete="street-address" maxLength={250} error={errors.address} />
  </div>
}
export function PartnerRegistrationForm({ onSubmit, loading }: { onSubmit: (data: PartnerRegistrationData) => Promise<void>; loading: boolean }) {
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const pending = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || pending.current) return
    const form = event.currentTarget
    const data = readRegistrationData(form)
    const nextErrors = validateRegistrationData(data)
    setErrors(nextErrors)
    const first = Object.keys(nextErrors)[0]
    if (first) { form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return }
    pending.current = true
    try { await onSubmit(data) } finally { pending.current = false }
  }
  return <form className={p.form} onSubmit={submit} noValidate aria-busy={loading}>
    <fieldset disabled={loading}><legend>Dane logowania</legend><p className={p.note}>Ustaw dostęp do strefy partnera CEL-TRONICS. Pola bez oznaczenia „opcjonalnie” są wymagane.</p><div className={p.fieldGrid}><Field name="email" label="Adres e-mail" type="email" autoComplete="email" required error={errors.email} /><Field name="password" label="Hasło" type="password" autoComplete="new-password" required error={errors.password} hint="Co najmniej 8 znaków, maksymalnie 72 bajty UTF-8." /></div></fieldset>
    <fieldset className={p.fieldset} disabled={loading}><legend>Dane firmy</legend><CompanyFields errors={errors} /></fieldset>
    <fieldset className={p.fieldset} disabled={loading}><legend>Potwierdzenie</legend><label className={p.consent}><input name="consentReg" type="checkbox" required aria-invalid={errors.consentReg ? true : undefined} aria-describedby={errors.consentReg ? "consentReg-error" : undefined} /><span>Akceptuję regulamin strefy partnera CEL-TRONICS</span></label>{errors.consentReg && <p id="consentReg-error" className={p.fieldError}>{errors.consentReg}</p>}<label className={p.consent}><input name="consentVat" type="checkbox" /><span>Zgadzam się na otrzymywanie faktur drogą elektroniczną (opcjonalnie)</span></label><p className={p.note}>Konto wymaga weryfikacji. Wysłanie zgłoszenia nie oznacza aktywacji dostępu ani przyznania warunków handlowych.</p></fieldset>
    {Object.keys(errors).length > 0 && <p role="alert" className={p.error}>Popraw zaznaczone pola. Zgłoszenie nie zostało wysłane.</p>}
    <button type="submit" className={s.primaryAction} disabled={loading}>{loading ? "Wysyłanie…" : "Wyślij zgłoszenie"}<ArrowUpRight size={20} aria-hidden="true" /></button>
  </form>
}
