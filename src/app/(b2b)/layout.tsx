import { auth, signOut } from "@/auth"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  FileText,
  Search,
  Settings,
  Wrench,
  UserRound,
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
    { href: "/dashboard", label: "Moje konto", icon: UserRound },
    { href: "/oferty/zamowienia", label: "Zamówienia", icon: FileText },
    { href: "/oferty/naprawy", label: "Serwis", icon: Wrench },
    { href: "/ustawienia", label: "Ustawienia", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#f4f4f1] text-slate-950 lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-[#dadcdd] bg-white lg:flex lg:flex-col">
        <div className="border-b border-[#e1e2e2] px-5 py-5">
          <Link href="/dashboard" className="block">
            <Image
              src="/assets/logo.svg"
              alt="CEL-TRONICS"
              width={168}
              height={34}
              className="h-auto w-[156px]"
              priority
            />
            <div className="mt-3 text-sm font-medium text-slate-600">
              Strefa partnera
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Strefa partnera">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-slate-700 transition hover:bg-[#f1f1ee] hover:text-slate-950"
              >
                <Icon className="h-[18px] w-[18px] text-slate-500" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#e1e2e2] p-4">
          <div className="truncate text-[15px] font-semibold text-slate-950">{identity}</div>
          <div className="mt-1 text-sm text-slate-600">
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
              className="min-h-11 w-full rounded-lg border border-[#d6d8d9] px-3 text-left text-[15px] font-medium text-slate-700 hover:border-slate-400"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-[#dedfdf] bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Image
              src="/assets/logo.svg"
              alt="CEL-TRONICS"
              width={142}
              height={29}
              className="h-auto w-[142px]"
              priority
            />
            <span className="text-sm font-medium text-slate-600">Strefa partnera</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Strefa partnera">
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-[#f1f1ee]"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <main className="p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  )
}
