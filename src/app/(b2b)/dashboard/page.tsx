import { auth } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FileText,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { isRepairTerminalStatus } from "@/lib/repairLifecycle"

type DashboardUser = {
  id?: string
  email?: string | null
  username?: string
  companyName?: string
  nip?: string | null
  tierName?: string
  discount?: number
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

type OwnedRecord = {
  user?: {
    id?: string | null
    email?: string | null
  }
  status?: unknown
}

export default async function DashboardPage() {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; name?: string | null }
    | undefined

  if (!sessionUser) redirect("/logowanie")

  const { users, orders, repairs } = initializeMockData()
  const storedUser = findStoredUserBySession(
    users as DashboardUser[],
    sessionUser
  )

  if (
    !storedUser ||
    storedUser.isBlocked ||
    storedUser.roleType !== "BIZ" ||
    !storedUser.isApproved
  ) {
    redirect("/logowanie")
  }

  const belongsToCurrentUser = (record: OwnedRecord) =>
    Boolean(
      record?.user &&
        findStoredUserBySession([record.user], {
          id: storedUser.id,
          email: storedUser.email,
        })
    )

  const ownOrders = (orders as OwnedRecord[]).filter(belongsToCurrentUser)
  const activeRepairs = (repairs as OwnedRecord[]).filter(
    (repair) =>
      belongsToCurrentUser(repair) && !isRepairTerminalStatus(repair.status)
  )

  const companyName =
    storedUser.companyName ||
    storedUser.username ||
    sessionUser.name ||
    "Partner"

  return (
    <div className="mx-auto max-w-[1200px] space-y-7">
      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Konto techniczne
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {companyName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Konto zweryfikowane
          </span>
          <span>NIP: {storedUser.nip || "brak"}</span>
          <span>Poziom: {storedUser.tierName || "BASIC"}</span>
          <span>
            Rabat: {Number(storedUser.discount || 0).toFixed(1)}%
          </span>
        </div>
      </header>

      <Link
        href="/field"
        className="flex min-h-24 items-center justify-between gap-4 rounded-xl bg-slate-950 p-5 text-white dark:bg-white dark:text-slate-950"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
            Najszybsza ścieżka
          </div>
          <div className="mt-2 text-xl font-semibold">
            Szukaj urządzenia, ceny lub instrukcji
          </div>
        </div>
        <Search className="h-7 w-7 shrink-0" />
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/oferty/zamowienia"
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f1216]"
        >
          <FileText className="h-5 w-5 text-slate-500" />
          <div className="mt-4 text-sm font-semibold">Zamówienia</div>
          <div className="mt-1 font-mono text-2xl font-semibold">
            {ownOrders.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Historia i bieżące statusy.
          </div>
        </Link>

        <Link
          href="/oferty/naprawy"
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f1216]"
        >
          <Wrench className="h-5 w-5 text-slate-500" />
          <div className="mt-4 text-sm font-semibold">Aktywny serwis</div>
          <div className="mt-1 font-mono text-2xl font-semibold">
            {activeRepairs.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Zgłoszenia jeszcze niezakończone.
          </div>
        </Link>
      </div>
    </div>
  )
}
