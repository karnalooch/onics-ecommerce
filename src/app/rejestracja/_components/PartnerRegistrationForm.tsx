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
      <div className="grid border-b border-[#d9dbdc] sm:grid-cols-3">
        {steps.map(([label, index]) => {
          const active = step === index
          const completed = step > index
          return (
            <div
              key={index}
              className={
                "flex min-h-16 items-center gap-3 border-b-2 px-5 text-[15px] sm:border-b-0 sm:border-t-2 " +
                (active
                  ? "border-primary bg-[#fbf7f7] font-semibold text-slate-950"
                  : completed
                    ? "border-transparent font-medium text-slate-700"
                    : "border-transparent text-slate-500")
              }
            >
              <span
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold " +
                  (active || completed
                    ? "border-primary text-primary"
                    : "border-[#cfd2d4] text-slate-500")
                }
              >
                {index}
              </span>
              {label}
            </div>
          )
        })}
      </div>

      <div className="p-5 sm:p-7 lg:p-8">
        {step === 1 ? (
          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950">
              Dane logowania
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Podaj służbowy adres e-mail i ustaw hasło do strefy partnera CEL-TRONICS.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
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
              Konto partnera aktywujemy po sprawdzeniu danych firmy. Samo wysłanie
              formularza nie udostępnia cen ani funkcji zamówień.
            </InfoBox>

            <div className="mt-6 flex justify-end">
              <NextButton
                disabled={!isStep1Valid}
                onClick={nextStep}
                label="Dalej: dane firmy"
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950">
              Dane firmy
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Na ich podstawie identyfikujemy kontrahenta i przypisujemy właściwe
              warunki handlowe.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
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

            <div className="mt-6 flex items-center justify-between gap-4">
              <BackButton onClick={prevStep} />
              <NextButton
                disabled={!isStep2Valid}
                onClick={nextStep}
                label="Dalej: potwierdzenie"
              />
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950">
              Potwierdzenie zgłoszenia
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Zaakceptuj wymagane warunki i wyślij dane firmy do weryfikacji.
            </p>

            <div className="mt-6 space-y-3">
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

            <div className="mt-6 flex items-center justify-between gap-4">
              <BackButton onClick={prevStep} />
              <button
                type="button"
                onClick={() => {
                  if (isStep3Valid) void onSubmit(formData)
                }}
                disabled={!isStep3Valid || loading}
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white hover:bg-[#a9161c] disabled:cursor-not-allowed disabled:opacity-40"
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
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-base font-medium text-slate-900">
        <span className="text-slate-500">{icon}</span>
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
        className="h-12 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none focus:border-primary"
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
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#d9dbdc] bg-[#fafaf8] p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#c61f26]"
      />
      <span className="text-base leading-6 text-slate-800">{label}</span>
    </label>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 border-l-2 border-primary bg-[#fbf7f7] px-4 py-3 text-[15px] leading-6 text-slate-700">
      {children}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-base font-medium text-slate-600 hover:text-slate-950"
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
      className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white hover:bg-[#a9161c] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
      <ChevronRight className="h-4 w-4" />
    </button>
  )
}
