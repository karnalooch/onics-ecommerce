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
    <div className="flex min-h-screen flex-col">
      <IconicNav />
      <main className="w-full flex-1">{children}</main>
      <footer className="border-t border-black/5 bg-white py-10 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-8 px-6 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-extrabold text-foreground">P.U.H. CEL-TRONICS S.C.</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              ul. Niklowa 22, 08-110 Siedlce<br />
              tel. 25 633 68 00 · serwis@celtronics.pl
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Link href="/produkty" className="hover:text-primary">Katalog B2B</Link>
            <Link href="/kontakt" className="hover:text-primary">Kontakt</Link>
            <Link href="/logowanie" className="hover:text-primary">Logowanie</Link>
            <span>© 2026 CEL-TRONICS</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
