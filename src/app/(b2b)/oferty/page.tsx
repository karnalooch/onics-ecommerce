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
    <div className="mx-auto max-w-[1280px]">
      <header className="border-b border-[#d9dbdc] pb-7">
        <p className="text-base font-semibold text-primary">Katalog partnera</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
          Produkty i zapytania
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Wyszukaj urządzenie, sprawdź cenę konta i stan magazynowy, a następnie
          dodaj pozycję do koszyka albo wyślij zapytanie.
        </p>
      </header>

      <div className="mt-6 flex gap-3 border-l-2 border-primary bg-[#fbf7f7] px-4 py-3 text-[15px] leading-6 text-slate-700">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Ceny wynikają z warunków przypisanych do Twojego konta. Dostępność i
          warunki projektowe mogą wymagać dodatkowego potwierdzenia przed realizacją.
        </p>
      </div>

      <div className="mt-7">
        <Suspense
          fallback={
            <div className="border border-[#d9dbdc] bg-white">
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div
                  key={row}
                  className="grid min-h-16 grid-cols-[minmax(0,1fr)_120px] items-center gap-4 border-b border-[#e0e1e1] px-4 last:border-b-0"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#e7e7e3]" />
                  <div className="h-8 animate-pulse rounded bg-[#efefeb]" />
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
    </div>
  )
}
