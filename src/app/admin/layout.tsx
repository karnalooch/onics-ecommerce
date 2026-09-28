import { auth } from "@/auth"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { AdminNavigation } from "./_components/AdminNavigation"
import { AdminLogoutButton } from "./_components/AdminLogoutButton"
import "./operations.css"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined

  if (!sessionUser) redirect("/logowanie")

  const { users } = initializeMockData()
  const currentUser = findStoredUserBySession(
    users as Array<{
      id?: string
      email?: string
      username?: string
      companyName?: string
      roleType?: string
      isBlocked?: boolean
    }>,
    sessionUser
  )

  if (!currentUser || currentUser.isBlocked || currentUser.roleType !== "ADMIN") {
    redirect("/logowanie")
  }

  const identity =
    currentUser.companyName || currentUser.username || currentUser.email || "Administrator"

  return (
    <KnowledgeProvider>
      <div className="operations-admin lg:grid lg:grid-cols-[276px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-[var(--ops-border)] bg-white lg:flex lg:flex-col">
          <div className="border-b border-[var(--ops-border)] px-5 py-5">
            <Link href="/admin" className="block">
              <Image
                src="/assets/logo.svg"
                alt="CEL-TRONICS"
                width={168}
                height={34}
                className="h-auto w-[156px]"
                priority
              />
              <div className="mt-3 text-sm font-medium text-slate-600">
                Panel operacyjny
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <AdminNavigation />
          </div>

          <div className="border-t border-[var(--ops-border)] p-4">
            <div className="truncate text-[15px] font-semibold text-slate-950">{identity}</div>
            <div className="mt-1 text-sm text-slate-600">
              Administrator
            </div>
            <div className="mt-4">
              <AdminLogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="border-b border-[var(--ops-border)] bg-white lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <Image
                src="/assets/logo.svg"
                alt="CEL-TRONICS"
                width={142}
                height={29}
                className="h-auto w-[142px]"
                priority
              />
              <Link
                href="/field"
                className="rounded-lg border border-[var(--ops-border)] px-3 py-2 text-sm font-medium text-slate-700"
              >
                Tryb instalatora
              </Link>
            </div>
            <AdminNavigation mobile />
          </div>

          <header className="hidden min-h-16 items-center justify-between border-b border-[var(--ops-border)] bg-white px-8 lg:flex">
            <div>
              <div className="text-sm font-semibold text-slate-950">Panel operacyjny</div>
              <div className="mt-0.5 text-sm text-slate-500">
                Kolejki, katalog, partnerzy, płatności i serwis
              </div>
            </div>
            <Link
              href="/field"
              className="rounded-lg border border-[var(--ops-border)] px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              Otwórz tryb instalatora
            </Link>
          </header>

          <main className="min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
        </div>
      </div>
    </KnowledgeProvider>
  )
}
