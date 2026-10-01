"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react"

type Profile = {
  email: string
  companyName: string
  nip: string | null
  phone: string
  address: string
  discount: number
  tierName: string
  isApproved: boolean
  revision: number
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const loadProfile = useCallback(async () => {
    setMessage("")
    try {
      const response = await fetch("/api/profile", { cache: "no-store" })
      const payload: unknown = await response.json().catch(() => null)

      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("email" in payload)
      ) {
        const error =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Nie udało się pobrać profilu."
        throw new Error(error)
      }

      const next = payload as Profile
      setProfile(next)
      setPhone(next.phone || "")
      setAddress(next.address || "")
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Nie udało się pobrać profilu."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadProfile])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!profile) return

    setSaving(true)
    setMessage("")

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          address,
          expectedRevision: profile?.revision ?? 0,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok || !payload || typeof payload !== "object") {
        const error =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Nie udało się zapisać danych."
        throw new Error(error)
      }

      const data = payload as Partial<Profile>
      setProfile((current) =>
        current
          ? {
              ...current,
              phone: data.phone ?? phone,
              address: data.address ?? address,
              revision: Number(data.revision ?? current.revision),
            }
          : current
      )
      setMessage("Dane kontaktowe zostały zapisane.")
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Nie udało się zapisać danych."
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[15px] text-red-900">
        {message || "Brak profilu."}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1120px]">
      <header className="border-b border-[#d9dbdc] pb-7">
        <p className="text-base font-semibold text-primary">Konto partnera</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
          Dane firmy i kontakt
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Dane identyfikacyjne są zarządzane przez CEL-TRONICS. Tutaj aktualizujesz
          numer kontaktowy i główny adres dostaw.
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit}
          className="border border-[#d9dbdc] bg-white p-5 sm:p-6"
        >
          <h2 className="text-xl font-semibold text-slate-950">Dane kontaktowe</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ReadOnlyField
              icon={Building2}
              label="Firma"
              value={profile.companyName || "—"}
            />
            <ReadOnlyField
              icon={ShieldCheck}
              label="NIP"
              value={profile.nip || "Brak NIP"}
            />
            <ReadOnlyField
              icon={Mail}
              label="E-mail konta"
              value={profile.email || "—"}
            />

            <label>
              <span className="mb-2 flex items-center gap-2 text-base font-medium text-slate-900">
                <Phone className="h-4 w-4 text-slate-500" />
                Telefon kontaktowy
              </span>
              <input
                type="tel"
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-12 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 flex items-center gap-2 text-base font-medium text-slate-900">
              <MapPin className="h-4 w-4 text-slate-500" />
              Główny adres dostaw
            </span>
            <input
              type="text"
              maxLength={250}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ulica, kod pocztowy, miejscowość"
              className="h-12 w-full rounded-lg border border-[#cfd2d4] bg-white px-4 text-base text-slate-950 outline-none focus:border-primary"
            />
          </label>

          {message ? (
            <div
              className="mt-5 border-l-2 border-primary bg-[#fbf7f7] px-4 py-3 text-[15px] leading-6 text-slate-700"
              aria-live="polite"
            >
              {message}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white hover:bg-[#a9161c] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Zapisz dane
            </button>
          </div>
        </form>

        <aside className="h-fit border border-[#d9dbdc] bg-white p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#16794b]" />
            <h2 className="text-base font-semibold text-slate-950">Status konta</h2>
          </div>
          <p className="mt-3 text-[15px] leading-6 text-slate-600">
            {profile.isApproved
              ? "Konto jest zatwierdzone i ma dostęp do funkcji partnera."
              : "Konto oczekuje na zatwierdzenie."}
          </p>

          <dl className="mt-5 divide-y divide-[#d9dbdc] border-y border-[#d9dbdc] text-[15px]">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-600">Poziom</dt>
              <dd className="font-mono font-semibold text-slate-950">{profile.tierName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-slate-600">
                <Percent className="h-4 w-4" />
                Rabat konta
              </dt>
              <dd className="font-mono font-semibold text-slate-950">
                {profile.discount.toFixed(1)}%
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div>
      <span className="mb-2 flex items-center gap-2 text-base font-medium text-slate-900">
        <Icon className="h-4 w-4 text-slate-500" />
        {label}
      </span>
      <div className="flex h-12 items-center rounded-lg border border-[#d9dbdc] bg-[#f7f7f4] px-4 text-base font-medium text-slate-700">
        {value}
      </div>
    </div>
  )
}
