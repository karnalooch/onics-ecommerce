"use client"

import { FormEvent, useEffect, useState } from "react"
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
  Save,
  Settings2,
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
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Nie udało się pobrać profilu.")
        setProfile(data)
        setPhone(data.phone || "")
        setAddress(data.address || "")
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Błąd profilu."))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage("")

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Nie udało się zapisać danych.")
      setMessage("Dane kontaktowe zostały zapisane.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Błąd zapisu.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return <div className="p-8 text-sm text-red-600">{message || "Brak profilu."}</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold">
          <Settings2 className="h-8 w-8 text-primary" />
          Ustawienia firmy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dane identyfikacyjne są zarządzane przez CEL-TRONICS. Tutaj możesz aktualizować dane kontaktowe i dostaw.
        </p>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-border bg-card p-8 shadow-sm md:col-span-2"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <ReadOnlyField icon={Building2} label="Firma" value={profile.companyName || "—"} />
            <ReadOnlyField icon={ShieldCheck} label="NIP" value={profile.nip || "Brak NIP"} />
            <ReadOnlyField icon={Mail} label="E-mail konta" value={profile.email || "—"} />

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Phone className="h-4 w-4" />
                Telefon kontaktowy
              </span>
              <input
                type="tel"
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Główny adres dostaw
            </span>
            <input
              type="text"
              maxLength={250}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ulica, kod pocztowy, miejscowość"
              className="h-12 w-full rounded-xl border border-border bg-background px-4"
            />
          </label>

          {message && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm font-medium">{message}</div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz dane
            </button>
          </div>
        </form>

        <aside className="rounded-3xl bg-[#102033] p-7 text-white shadow-xl">
          <ShieldCheck className="h-7 w-7 text-blue-300" />
          <h2 className="mt-5 text-xl font-extrabold">Status partnera</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {profile.isApproved
              ? "Konto jest zatwierdzone i ma dostęp do strefy B2B."
              : "Konto oczekuje na zatwierdzenie."}
          </p>

          <div className="mt-7 space-y-4 border-t border-white/10 pt-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Poziom
              </span>
              <strong className="mt-1 block">{profile.tierName}</strong>
            </div>
            <div>
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Percent className="h-3 w-3" />
                Rabat konta
              </span>
              <strong className="mt-1 block text-2xl text-blue-300">
                {profile.discount.toFixed(1)}%
              </strong>
            </div>
          </div>
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
      <span className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <div className="flex h-12 items-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-semibold">
        {value}
      </div>
    </div>
  )
}
