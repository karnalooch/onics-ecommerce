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
          expectedRevision: profile.revision,
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

      const patch = payload as Partial<Profile>
      setProfile((current) =>
        current
          ? {
              ...current,
              phone: patch.phone ?? phone,
              address: patch.address ?? address,
              revision: Number(patch.revision ?? current.revision),
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">
        {message || "Brak profilu."}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Konto partnera
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Dane firmy
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Dane identyfikacyjne są zarządzane przez CEL-TRONICS. Tutaj aktualizujesz kontakt i główny adres dostaw.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f1216]"
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Phone className="h-4 w-4 text-slate-500" />
                Telefon kontaktowy
              </span>
              <input
                type="tel"
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-slate-500" />
              Główny adres dostaw
            </span>
            <input
              type="text"
              maxLength={250}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ulica, kod pocztowy, miejscowość"
              className="h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"
            />
          </label>

          {message ? (
            <div
              className="mt-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800"
              aria-live="polite"
            >
              {message}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {saving ? (
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 inline h-4 w-4" />
              )}
              Zapisz dane
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f1216]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-semibold">Status konta</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {profile.isApproved
              ? "Konto jest zatwierdzone i ma dostęp do strefy B2B."
              : "Konto oczekuje na zatwierdzenie."}
          </p>

          <dl className="mt-5 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-slate-500">Poziom</dt>
              <dd className="font-mono font-semibold">{profile.tierName}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="flex items-center gap-2 text-slate-500">
                <Percent className="h-4 w-4" />
                Rabat konta
              </dt>
              <dd className="font-mono font-semibold">
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
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-slate-500" />
        {label}
      </span>
      <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium dark:border-slate-800 dark:bg-white/[0.03]">
        {value}
      </div>
    </div>
  )
}
