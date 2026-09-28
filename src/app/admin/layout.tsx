import { auth, signOut } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { AdminNavigation } from "./_components/AdminNavigation"
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
      <div className="operations-admin lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-[var(--ops-border)] bg-[var(--ops-panel)] lg:flex lg:flex-col">
          <div className="border-b border-[var(--ops-border)] px-5 py-5">
            <Link href="/admin" className="block">
              <div className="text-sm font-extrabold tracking-[0.18em]">ONICS</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
                Operations console
              </div>
            </Link>
          </div>

          <div className="flex-1 px-3 py-4">
            <AdminNavigation />
          </div>

          <div className="border-t border-[var(--ops-border)] p-4">
            <div className="truncate text-sm font-semibold">{identity}</div>
            <div className="mt-1 text-xs text-[var(--ops-muted)]">
              ADMIN · dostęp operacyjny
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
                className="min-h-11 w-full rounded-lg border border-[var(--ops-border)] px-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
              >
                Wyloguj
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="border-b border-[var(--ops-border)] bg-[var(--ops-panel)] lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-extrabold tracking-[0.18em]">ONICS</div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--ops-muted)]">
                  Operations
                </div>
              </div>
              <Link
                href="/field"
                className="rounded-lg border border-[var(--ops-border)] px-3 py-2 text-sm font-semibold"
              >
                Field
              </Link>
            </div>
            <AdminNavigation mobile />
          </div>

          <header className="hidden min-h-16 items-center justify-between border-b border-[var(--ops-border)] bg-[var(--ops-panel)] px-8 lg:flex">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">
              System techniczno-operacyjny
            </div>
            <Link
              href="/field"
              className="rounded-lg border border-[var(--ops-border)] px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Otwórz tryb instalatora
            </Link>
          </header>

          <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </KnowledgeProvider>
  )
}
