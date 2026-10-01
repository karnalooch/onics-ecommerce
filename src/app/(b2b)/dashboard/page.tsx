import { auth } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
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
    <div className="mx-auto max-w-[1180px]">
      <header className="border-b border-[#d9dbdc] pb-7">
        <p className="text-base font-semibold text-primary">Strefa partnera</p>
        <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
              {companyName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-slate-600">
              <span className="inline-flex items-center gap-2 font-medium text-[#16794b]">
                <ShieldCheck className="h-4 w-4" />
                Konto zweryfikowane
              </span>
              <span>NIP: {storedUser.nip || "brak"}</span>
              <span>Poziom: {storedUser.tierName || "BASIC"}</span>
              <span>Rabat: {Number(storedUser.discount || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-7">
        <Link
          href="/field"
          className="group grid min-h-32 gap-5 rounded-xl border border-[#d9dbdc] bg-white p-6 transition hover:border-slate-400 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-primary">
              <Search className="h-5 w-5" />
              Najszybsza ścieżka
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Szukaj urządzenia, ceny albo instrukcji technicznej
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Wyszukiwanie po modelu, SKU, producencie i parametrach technicznych.
            </p>
          </div>
          <ArrowRight className="h-6 w-6 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Twoja obsługa</h2>
            <p className="mt-1 text-[15px] text-slate-600">
              Bieżące zamówienia i zgłoszenia serwisowe.
            </p>
          </div>
        </div>

        <div className="grid border-t border-l border-[#d9dbdc] sm:grid-cols-2">
          <Link
            href="/oferty/zamowienia"
            className="min-h-48 border-r border-b border-[#d9dbdc] bg-white p-6 transition hover:bg-[#fafaf8]"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-950">Zamówienia</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Historia, płatności i status realizacji.
                </p>
              </div>
              <div className="font-mono text-3xl font-semibold text-slate-950">
                {ownOrders.length}
              </div>
            </div>
          </Link>

          <Link
            href="/oferty/naprawy"
            className="min-h-48 border-r border-b border-[#d9dbdc] bg-white p-6 transition hover:bg-[#fafaf8]"
          >
            <Wrench className="h-5 w-5 text-primary" />
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-950">Aktywny serwis</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Zgłoszenia, które nie zostały jeszcze zakończone.
                </p>
              </div>
              <div className="font-mono text-3xl font-semibold text-slate-950">
                {activeRepairs.length}
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-8 border-l-2 border-primary bg-[#fbf7f7] px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Potrzebujesz produktu do zamówienia?</h2>
        <p className="mt-1 text-[15px] leading-6 text-slate-600">
          Przejdź do katalogu partnera, aby sprawdzić cenę konta, dostępność i dodać pozycję.
        </p>
        <Link
          href="/oferty"
          className="mt-3 inline-flex items-center gap-2 text-[15px] font-semibold text-primary hover:underline"
        >
          Otwórz katalog partnera
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  )
}
