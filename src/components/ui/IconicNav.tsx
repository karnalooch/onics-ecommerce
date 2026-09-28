"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useState } from "react"
import { LogOut, Menu, X } from "lucide-react"

const publicItems = [
  { name: "Firma", path: "/" },
  { name: "Usługi", path: "/uslugi" },
  { name: "Katalog", path: "/produkty" },
  { name: "Kontakt", path: "/kontakt" },
]

export function IconicNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAuthenticated = status === "authenticated"
  const role = (session?.user as { role?: string } | undefined)?.role
  const workspaceHref = role === "ADMIN" ? "/admin" : "/dashboard"
  const workspaceLabel = role === "ADMIN" ? "Panel operacyjny" : "Strefa partnera"

  const activePath = (path: string) => {
    if (path === "/") return pathname === "/"
    return pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-[100] border-b border-[#dedfdf] bg-white">
      <div className="mx-auto flex h-[68px] w-full max-w-[1320px] items-center gap-8 px-5 sm:px-7">
        <Link
          href="/"
          className="shrink-0"
          aria-label="CEL-TRONICS — strona główna"
        >
          <Image
            src="/assets/logo.svg"
            alt="CEL-TRONICS"
            width={170}
            height={34}
            priority
            className="h-auto w-[150px] sm:w-[170px]"
          />
        </Link>

        <nav className="hidden flex-1 items-stretch gap-1 md:flex" aria-label="Główna nawigacja">
          {publicItems.map((item) => {
            const active = activePath(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                className={
                  "flex items-center border-b-2 px-4 text-[15px] font-medium transition-colors " +
                  (active
                    ? "border-primary text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-950")
                }
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                href={workspaceHref}
                className="inline-flex min-h-11 items-center rounded-lg bg-slate-950 px-4 text-[15px] font-semibold text-white transition hover:bg-slate-800"
              >
                {workspaceLabel}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden min-h-11 items-center gap-2 rounded-lg border border-[#d8dadd] px-4 text-[15px] font-medium text-slate-700 hover:border-slate-400 sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj
              </button>
            </>
          ) : (
            <Link
              href="/logowanie"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-[15px] font-semibold text-white transition hover:bg-[#a9161c]"
            >
              Strefa partnera
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d8dadd] text-slate-800 md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Zamknij menu" : "Otwórz menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-[#e3e4e4] bg-white px-5 py-3 md:hidden" aria-label="Nawigacja mobilna">
          <div className="mx-auto grid max-w-[1320px]">
            {publicItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className="border-b border-[#ececec] py-3 text-base font-medium text-slate-800 last:border-b-0"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
