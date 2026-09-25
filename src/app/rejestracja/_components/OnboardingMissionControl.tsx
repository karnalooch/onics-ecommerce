"use client"

import { useState } from "react"
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react"
import { validateNip, calculatePasswordStrength, validateEmail } from "@/lib/validation"

export interface OnboardingFormData {
  email: string
  password: string
  nip: string
  companyName: string
  phone: string
  address: string
  consentVat: boolean
  consentReg: boolean
}

interface IOnboardingProps {
  onSubmit: (data: OnboardingFormData) => Promise<void>
  loading: boolean
}

export function OnboardingMissionControl({ onSubmit, loading }: IOnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [formData, setFormData] = useState<OnboardingFormData>({
    email: "",
    password: "",
    nip: "",
    companyName: "",
    phone: "",
    address: "",
    consentVat: false,
    consentReg: false,
  })

  const nextStep = () => setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)
  const prevStep = () => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)

  const isStep1Valid =
    validateEmail(formData.email) && calculatePasswordStrength(formData.password) >= 1
  const isStep2Valid = validateNip(formData.nip) && formData.companyName.trim().length > 3
  const isStep3Valid = formData.consentReg

  const handleFinalSubmit = async () => {
    if (isStep3Valid) await onSubmit(formData)
  }

  const steps = [
    ["Dane logowania", 1],
    ["Dane firmy", 2],
    ["Zgody i wysłanie", 3],
  ] as const

  return (
    <div>
      <div className="grid border-b border-black/5 bg-black/[0.018] sm:grid-cols-3 dark:border-white/10 dark:bg-white/[0.025]">
        {steps.map(([label, index]) => {
          const active = step >= index
          return (
            <div
              key={index}
              className={`flex items-center gap-3 px-5 py-4 text-xs font-extrabold ${
                active ? "text-foreground" : "text-muted-foreground/55"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  active ? "bg-primary text-white" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {index}
              </span>
              {label}
            </div>
          )
        })}
      </div>

      <div className="p-6 sm:p-8">
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Zacznij od danych do konta</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              Podaj służbowy adres e-mail oraz hasło, którego będziesz używać do logowania.
            </p>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <Field
                label="Adres e-mail"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                autoComplete="email"
                placeholder="imie@firma.pl"
                value={formData.email}
                onChange={(value) => setFormData((state) => ({ ...state, email: value }))}
              />
              <Field
                label="Hasło"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 znaków"
                value={formData.password}
                onChange={(value) => setFormData((state) => ({ ...state, password: value }))}
              />
            </div>

            <InfoBox>
              Konto B2B jest aktywowane po sprawdzeniu danych firmy. Jeśli masz już konto
              albo potrzebujesz pomocy, skontaktuj się z nami.
            </InfoBox>

            <div className="mt-7 flex justify-end">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={nextStep}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Dalej
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Dane firmy</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              Dane są potrzebne do identyfikacji kontrahenta i obsługi konta B2B.
            </p>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <Field
                label="NIP"
                icon={<ShieldCheck className="h-4 w-4" />}
                type="text"
                inputMode="numeric"
                placeholder="1234567890"
                maxLength={10}
                value={formData.nip}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, nip: value.replace(/\D/g, "") }))
                }
              />
              <Field
                label="Nazwa firmy"
                icon={<Building2 className="h-4 w-4" />}
                type="text"
                placeholder="Pełna nazwa firmy"
                value={formData.companyName}
                onChange={(value) => setFormData((state) => ({ ...state, companyName: value }))}
              />
              <Field
                label="Telefon"
                icon={<Phone className="h-4 w-4" />}
                type="tel"
                autoComplete="tel"
                placeholder="+48 000 000 000"
                value={formData.phone}
                onChange={(value) => setFormData((state) => ({ ...state, phone: value }))}
              />
              <Field
                label="Adres firmy"
                icon={<Building2 className="h-4 w-4" />}
                type="text"
                autoComplete="street-address"
                placeholder="Ulica, kod pocztowy, miejscowość"
                value={formData.address}
                onChange={(value) => setFormData((state) => ({ ...state, address: value }))}
              />
            </div>

            <div className="mt-7 flex items-center justify-between">
              <BackButton onClick={prevStep} />
              <button
                type="button"
                onClick={nextStep}
                disabled={!isStep2Valid}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                Dalej
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Zgody i wysłanie</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              Sprawdź dane i zaakceptuj wymagane warunki przed wysłaniem zgłoszenia.
            </p>

            <div className="mt-7 space-y-3">
              <Consent
                label="Akceptuję regulamin platformy B2B CEL-TRONICS"
                checked={formData.consentReg}
                onChange={(value) => setFormData((state) => ({ ...state, consentReg: value }))}
              />
              <Consent
                label="Zgadzam się na otrzymywanie faktur drogą elektroniczną"
                checked={formData.consentVat}
                onChange={(value) => setFormData((state) => ({ ...state, consentVat: value }))}
              />
            </div>

            <InfoBox>
              Po wysłaniu zgłoszenia dane firmy trafią do weryfikacji. Informację o aktywacji
              konta otrzymasz zgodnie z procesem obsługi CEL-TRONICS.
            </InfoBox>

            <div className="mt-7 flex items-center justify-between">
              <BackButton onClick={prevStep} />
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!isStep3Valid || loading}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                {loading ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  maxLength,
  autoComplete,
  inputMode,
}: {
  label: string
  icon: React.ReactNode
  type: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  maxLength?: number
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="h-13 w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-semibold outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-white/[0.04]"
      />
    </label>
  )
}

function Consent({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/5 p-4 dark:border-white/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span className="text-sm font-semibold leading-5">{label}</span>
    </label>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-primary/10 bg-primary/[0.055] p-4 text-sm font-medium leading-6 text-muted-foreground">
      {children}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold text-muted-foreground transition hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      Wstecz
    </button>
  )
}
