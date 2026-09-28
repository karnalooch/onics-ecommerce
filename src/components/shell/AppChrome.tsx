"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconicNav } from "@/components/ui/IconicNav"

function isOperationalSurface(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/field") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/oferty") ||
    pathname.startsWith("/ustawienia")
  )
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isOperationalSurface(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <IconicNav />
      <main className="w-full flex-1">{children}</main>
      <footer className="border-t border-[#dfe1e1] bg-white">
        <div className="mx-auto grid w-full max-w-[1320px] gap-8 px-5 py-10 sm:px-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="text-base font-semibold text-slate-950">
              P.U.H. CEL-TRONICS S.C.
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Systemy zabezpieczeń, sprzedaż urządzeń, obsługa partnerów i serwis.
              Siedlce, ul. Niklowa 22.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              25 633 68 00 · serwis@celtronics.pl
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
            <Link href="/produkty" className="hover:text-primary">Katalog</Link>
            <Link href="/kontakt" className="hover:text-primary">Kontakt</Link>
            <Link href="/logowanie" className="hover:text-primary">Strefa partnera</Link>
            <span className="text-slate-400">© 2026 CEL-TRONICS</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
