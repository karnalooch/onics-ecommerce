"use client"

import { useState } from "react"
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react"
import {
  calculatePasswordStrength,
  validateEmail,
  validateNip,
} from "@/lib/validation"

export interface PartnerRegistrationData {
  email: string
  password: string
  nip: string
  companyName: string
  phone: string
  address: string
  consentVat: boolean
  consentReg: boolean
}

interface PartnerRegistrationFormProps {
  onSubmit: (data: PartnerRegistrationData) => Promise<void>
  loading: boolean
}

export function PartnerRegistrationForm({
  onSubmit,
  loading,
}: PartnerRegistrationFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [formData, setFormData] = useState<PartnerRegistrationData>({
    email: "",
    password: "",
    nip: "",
    companyName: "",
    phone: "",
    address: "",
    consentVat: false,
    consentReg: false,
  })

  const nextStep = () =>
    setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)
  const prevStep = () =>
    setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)

  const isStep1Valid =
    validateEmail(formData.email) &&
    calculatePasswordStrength(formData.password) >= 1
  const isStep2Valid =
    validateNip(formData.nip) && formData.companyName.trim().length > 3
  const isStep3Valid = formData.consentReg

  const steps = [
    ["Konto", 1],
    ["Firma", 2],
    ["Potwierdzenie", 3],
  ] as const

  return (
    <div>
      <div className="grid border-b border-slate-200 sm:grid-cols-3 dark:border-slate-800">
        {steps.map(([label, index]) => {
          const active = step >= index
          return (
            <div
              key={index}
              className={
                "flex min-h-14 items-center gap-3 px-4 text-sm " +
                (active ? "font-semibold text-foreground" : "text-slate-400")
              }
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-md border text-xs font-mono " +
                  (active
                    ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 dark:border-slate-800")
                }
              >
                {index}
              </span>
              {label}
            </div>
          )
        })}
      </div>

      <div className="p-5 sm:p-6">
        {step === 1 ? (
          <section>
            <h2 className="text-xl font-semibold">Dostęp do strefy partnera</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ustaw służbowy adres e-mail i hasło do konta CEL-TRONICS.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Adres e-mail"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                autoComplete="email"
                placeholder="imie@firma.pl"
                value={formData.email}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, email: value }))
                }
              />
              <Field
                label="Hasło"
                icon={<Lock className="h-4 w-4" />}
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 znaków"
                value={formData.password}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, password: value }))
                }
              />
            </div>

            <InfoBox>
              Konto partnera aktywujemy po sprawdzeniu danych firmy. W razie
              problemów z dostępem skontaktuj się bezpośrednio z CEL-TRONICS.
            </InfoBox>

            <div className="mt-5 flex justify-end">
              <NextButton
                disabled={!isStep1Valid}
                onClick={nextStep}
                label="Dalej"
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <h2 className="text-xl font-semibold">Dane firmy</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Dane służą do identyfikacji kontrahenta i przypisania warunków
              handlowych.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="NIP"
                icon={<ShieldCheck className="h-4 w-4" />}
                type="text"
                inputMode="numeric"
                placeholder="1234567890"
                maxLength={10}
                value={formData.nip}
                onChange={(value) =>
                  setFormData((state) => ({
                    ...state,
                    nip: value.replace(/\D/g, ""),
                  }))
                }
              />
              <Field
                label="Nazwa firmy"
                icon={<Building2 className="h-4 w-4" />}
                type="text"
                placeholder="Pełna nazwa firmy"
                value={formData.companyName}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, companyName: value }))
                }
              />
              <Field
                label="Telefon"
                icon={<Phone className="h-4 w-4" />}
                type="tel"
                autoComplete="tel"
                placeholder="+48 000 000 000"
                value={formData.phone}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, phone: value }))
                }
              />
              <Field
                label="Adres firmy"
                icon={<Building2 className="h-4 w-4" />}
                type="text"
                autoComplete="street-address"
                placeholder="Ulica, kod pocztowy, miejscowość"
                value={formData.address}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, address: value }))
                }
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <BackButton onClick={prevStep} />
              <NextButton
                disabled={!isStep2Valid}
                onClick={nextStep}
                label="Dalej"
              />
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <h2 className="text-xl font-semibold">Potwierdzenie zgłoszenia</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Zaakceptuj wymagane warunki i wyślij dane do weryfikacji
              CEL-TRONICS.
            </p>

            <div className="mt-5 space-y-3">
              <Consent
                label="Akceptuję regulamin strefy partnera CEL-TRONICS"
                checked={formData.consentReg}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, consentReg: value }))
                }
              />
              <Consent
                label="Zgadzam się na otrzymywanie faktur drogą elektroniczną"
                checked={formData.consentVat}
                onChange={(value) =>
                  setFormData((state) => ({ ...state, consentVat: value }))
                }
              />
            </div>

            <InfoBox>
              Po weryfikacji firmy konto otrzyma dostęp do cen i funkcji
              przypisanych do partnera CEL-TRONICS.
            </InfoBox>

            <div className="mt-5 flex items-center justify-between">
              <BackButton onClick={prevStep} />
              <button
                type="button"
                onClick={() => {
                  if (isStep3Valid) void onSubmit(formData)
                }}
                disabled={!isStep3Valid || loading}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
              >
                {loading ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                <Check className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}
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
    <label>
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
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
        className="h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 text-sm outline-none focus:border-slate-950 dark:border-slate-700 dark:focus:border-white"
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
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-slate-950"
      />
      <span className="text-sm font-medium leading-5">{label}</span>
    </label>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">
      {children}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-500"
    >
      <ChevronLeft className="h-4 w-4" />
      Wstecz
    </button>
  )
}

function NextButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
    >
      {label}
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
