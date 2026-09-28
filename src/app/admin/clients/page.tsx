"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Download, Search, Settings2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/types"

async function readApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}))
  return typeof payload?.error === "string" ? payload.error : fallback
}

function accountStatus(user: User) {
  if (user.isBlocked) return "Zablokowane"
  if (!user.isApproved) return "Oczekuje"
  return "Aktywne"
}

function statusClass(user: User) {
  if (user.isBlocked) {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
  }
  if (!user.isApproved) {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
}

export default function AdminClientsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [tempDiscount, setTempDiscount] = useState("0")
  const [tempTier, setTempTier] = useState("PARTNER")
  const [saving, setSaving] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Nie udało się pobrać rejestru partnerów.")
        )
      }

      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error("Serwer zwrócił nieprawidłowy rejestr partnerów.")
      }

      setUsers(data)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Błąd synchronizacji rejestru partnerów."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return users

    return users.filter((user) =>
      [
        user.email,
        user.companyName,
        user.username,
        user.nip,
        user.tierName,
        user.roleType,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query))
    )
  }, [searchTerm, users])

  const toggleBlock = async (user: User) => {
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isBlocked: !user.isBlocked,
          expectedRevision: Number(user.revision ?? 0),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            user.isBlocked
              ? "Nie udało się odblokować konta."
              : "Nie udało się zablokować konta."
          )
        )
      }

      toast.success(user.isBlocked ? "Konto odblokowane." : "Konto zablokowane.")
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd zapisu.")
    }
  }

  const deleteUser = async (user: User) => {
    if (
      !window.confirm(
        "Trwale usunąć konto " +
          (user.companyName || user.email) +
          "? Tej operacji nie można cofnąć."
      )
    ) {
      return
    }

    try {
      const response = await fetch(
        "/api/users?id=" +
          encodeURIComponent(user.id) +
          "&expectedRevision=" +
          encodeURIComponent(Number(user.revision ?? 0)),
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Nie udało się usunąć konta.")
        )
      }

      toast.success("Konto usunięte.")
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd zapisu.")
    }
  }

  const openConditions = (user: User) => {
    setSelectedUser(user)
    setTempDiscount(String(user.discount || 0))
    setTempTier(user.tierName || "PARTNER")
  }

  const saveConditions = async () => {
    if (!selectedUser) return

    const discount = Number(tempDiscount)
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      toast.error("Rabat musi być liczbą od 0 do 100.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/users/discount", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          discount,
          tierName: tempTier.trim() || "PARTNER",
          expectedRevision: Number(selectedUser.revision ?? 0),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Nie udało się zapisać warunków handlowych."
          )
        )
      }

      toast.success("Warunki konta zapisane.")
      setSelectedUser(null)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd zapisu.")
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    const rows = filteredUsers.map((user) => ({
      Firma: user.companyName || user.username || "",
      Email: user.email,
      NIP: user.nip || "",
      Rola: user.roleType,
      Rabat: user.discount || 0,
      Poziom: user.tierName || "BASIC",
      Status: accountStatus(user),
    }))

    const headers = [
      "Firma",
      "Email",
      "NIP",
      "Rola",
      "Rabat",
      "Poziom",
      "Status",
    ] as const
    const escape = (value: unknown) =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    const csv = [
      headers.join(";"),
      ...rows.map((row) =>
        headers.map((header) => escape(row[header])).join(";")
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download =
      "celtronics-partnerzy-" + new Date().toISOString().slice(0, 10) + ".csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeCount = users.filter(
    (user) => user.isApproved && !user.isBlocked
  ).length
  const waitingCount = users.filter(
    (user) => !user.isApproved && !user.isBlocked
  ).length
  const blockedCount = users.filter((user) => user.isBlocked).length

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 lg:flex-row lg:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
            Rejestr partnerów
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Klienci i konta B2B
          </h1>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Dostęp, status konta i warunki handlowe bez warstwy sklepowej.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
            Aktywne <strong className="ml-2 font-mono">{activeCount}</strong>
          </span>
          <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
            Oczekuje <strong className="ml-2 font-mono">{waitingCount}</strong>
          </span>
          <span className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-3 py-2">
            Blokady <strong className="ml-2 font-mono">{blockedCount}</strong>
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Szukaj partnera</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ops-muted)]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Firma, e-mail, NIP, poziom…"
            className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] pl-10 pr-3 text-sm outline-none focus:border-slate-500"
          />
        </label>
        <button
          type="button"
          onClick={exportCsv}
          className="min-h-11 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-panel)] px-4 text-sm font-semibold"
        >
          <Download className="mr-2 inline h-4 w-4" />
          Eksport CSV
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)]">
        <div className="hidden min-h-11 grid-cols-[minmax(230px,1.4fr)_minmax(180px,1fr)_130px_110px_120px_180px] items-center gap-4 border-b border-[var(--ops-border)] px-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ops-muted)] lg:grid">
          <span>Partner</span>
          <span>Kontakt</span>
          <span>Status</span>
          <span>Poziom</span>
          <span>Rabat</span>
          <span className="text-right">Akcje</span>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-[var(--ops-muted)]">
            Pobieranie rejestru…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-[var(--ops-muted)]">
            Brak pasujących kont.
          </div>
        ) : (
          <div className="divide-y divide-[var(--ops-border)]">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(230px,1.4fr)_minmax(180px,1fr)_130px_110px_120px_180px] lg:items-center"
              >
                <div className="min-w-0">
                  <Link
                    href={"/admin/clients/" + user.id}
                    className="truncate font-semibold hover:underline"
                  >
                    {user.companyName || user.username || user.email}
                  </Link>
                  <div className="mt-1 font-mono text-xs text-[var(--ops-muted)]">
                    NIP {user.nip || "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm">{user.email}</div>
                  <div className="mt-1 text-xs text-[var(--ops-muted)]">
                    {user.roleType}
                  </div>
                </div>

                <div>
                  <span
                    className={
                      "inline-flex rounded-md border px-2 py-1 text-xs font-semibold " +
                      statusClass(user)
                    }
                  >
                    {accountStatus(user)}
                  </span>
                </div>

                <div className="font-mono text-sm">
                  {user.tierName || "BASIC"}
                </div>

                <div className="font-mono text-sm">
                  {Number(user.discount || 0).toFixed(1)}%
                </div>

                <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => openConditions(user)}
                    className="min-h-9 rounded-md border border-[var(--ops-border)] px-3 text-xs font-semibold"
                  >
                    <Settings2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Warunki
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleBlock(user)}
                    className="min-h-9 rounded-md border border-[var(--ops-border)] px-3 text-xs font-semibold"
                  >
                    <Ban className="mr-1.5 inline h-3.5 w-3.5" />
                    {user.isBlocked ? "Odblokuj" : "Zablokuj"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteUser(user)}
                    className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
                    aria-label={"Usuń konto " + (user.companyName || user.email)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conditions-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !saving) {
              setSelectedUser(null)
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-5">
            <div className="border-b border-[var(--ops-border)] pb-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--ops-muted)]">
                Warunki konta
              </div>
              <h2 id="conditions-title" className="mt-1 text-xl font-semibold">
                {selectedUser.companyName ||
                  selectedUser.username ||
                  selectedUser.email}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-2 block font-semibold">Rabat (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={tempDiscount}
                  onChange={(event) => setTempDiscount(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 font-mono"
                />
              </label>

              <label className="text-sm">
                <span className="mb-2 block font-semibold">Poziom</span>
                <input
                  value={tempTier}
                  onChange={(event) => setTempTier(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--ops-border)] bg-transparent px-3 font-mono uppercase"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelectedUser(null)}
                className="min-h-11 rounded-lg border border-[var(--ops-border)] px-4 text-sm font-semibold"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveConditions()}
                className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
              >
                {saving ? "Zapisywanie…" : "Zapisz warunki"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
