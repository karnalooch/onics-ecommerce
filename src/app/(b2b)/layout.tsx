import { auth, signOut } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FileText,
  Gauge,
  Search,
  Settings,
  Wrench,
} from "lucide-react"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

export default async function B2BLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; name?: string | null }
    | undefined

  if (!sessionUser) redirect("/logowanie")

  const { users } = initializeMockData()
  const currentUser = findStoredUserBySession(
    users as Array<{
      id?: string
      email?: string
      companyName?: string
      username?: string
      roleType?: string
      isApproved?: boolean
      isBlocked?: boolean
      nip?: string | null
      discount?: number
      tierName?: string
    }>,
    sessionUser
  )

  if (
    !currentUser ||
    currentUser.isBlocked ||
    currentUser.roleType !== "BIZ" ||
    !currentUser.isApproved
  ) {
    redirect("/logowanie")
  }

  const identity =
    currentUser.companyName ||
    currentUser.username ||
    sessionUser.name ||
    "Partner"

  const nav = [
    { href: "/field", label: "Szukaj urządzenia", icon: Search },
    { href: "/dashboard", label: "Moje konto", icon: Gauge },
    { href: "/oferty/zamowienia", label: "Zamówienia", icon: FileText },
    { href: "/oferty/naprawy", label: "Serwis", icon: Wrench },
    { href: "/ustawienia", label: "Ustawienia", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-slate-950 dark:bg-[#090b0e] dark:text-slate-100 lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216] lg:flex lg:flex-col">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <div className="text-sm font-extrabold tracking-[0.18em]">ONICS</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Partner / field
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="truncate text-sm font-semibold">{identity}</div>
          <div className="mt-1 text-xs text-slate-500">
            {currentUser.tierName || "BASIC"} · rabat{" "}
            {Number(currentUser.discount || 0).toFixed(1)}%
          </div>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-left text-sm font-semibold dark:border-slate-800"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#0f1216] lg:hidden">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
