import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Info } from "lucide-react"
import { B2BDashboardGrid } from "@/components/ui/B2BDashboardGrid"
import { buildCartOwnerKey } from "@/lib/cartIdentity"

export default async function B2BOfertyPage() {
  const session = await auth()
  const sessionUser = session?.user as
    | {
        id?: string
        email?: string | null
        role?: string
        nip?: string | null
      }
    | undefined

  if (!sessionUser || sessionUser.role !== "BIZ") {
    redirect("/logowanie")
  }

  const cartOwnerKey = buildCartOwnerKey(sessionUser)
  if (!cartOwnerKey) {
    redirect("/logowanie")
  }

  const userNIP = sessionUser.nip || "BRAK NIP"
  const userEmail = sessionUser.email || "unknown"

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Katalog B2B
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Produkty i zapytania
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Znajdź urządzenia, sprawdź warunki konta i dodaj pozycje do zapytania ofertowego.
        </p>
      </header>

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 dark:border-slate-800 dark:bg-[#0f1216]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-slate-600 dark:text-slate-300">
          Dostępność i warunki projektowe mogą wymagać potwierdzenia przez zespół handlowy.
          Ceny widoczne w katalogu wynikają z konfiguracji Twojego konta.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px] items-center gap-4 border-b border-slate-200 px-4 last:border-b-0 dark:border-slate-800"
              >
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
              </div>
            ))}
          </div>
        }
      >
        <B2BDashboardGrid
          nip={userNIP}
          email={userEmail}
          ownerKey={cartOwnerKey}
        />
      </Suspense>
    </div>
  )
}
