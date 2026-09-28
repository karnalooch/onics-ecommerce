"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useState, useSyncExternalStore } from "react"
import {
  BookOpen,
  Boxes,
  Contact,
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react"

const emptySubscribe = () => () => {}
const getClientMountedSnapshot = () => true
const getServerMountedSnapshot = () => false

export function IconicNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMountedSnapshot,
    getServerMountedSnapshot
  )
  const [mobileOpenPath, setMobileOpenPath] = useState<string | null>(null)
  const mobileOpen = mobileOpenPath === pathname

  const isAuthenticated = status === "authenticated"
  const isAdmin =
    isAuthenticated &&
    (session?.user as { role?: string } | undefined)?.role === "ADMIN"

  const publicItems = [
    { name: "Start", path: "/", icon: Home },
    { name: "Usługi", path: "/#uslugi", icon: ShieldCheck },
    { name: "Katalog", path: "/produkty", icon: BookOpen },
    { name: "Kontakt", path: "/kontakt", icon: Contact },
  ]

  const activePath = (path: string) => {
    const plain = path.split("#")[0]
    if (plain === "/") return pathname === "/"
    return pathname.startsWith(plain)
  }

  const NavLink = ({
    item,
    compact = false,
  }: {
    item: { name: string; path: string; icon: LucideIcon }
    compact?: boolean
  }) => (
    <Link
      href={item.path}
      onClick={() => setMobileOpenPath(null)}
      className={
        "flex items-center gap-2 rounded-lg text-sm font-semibold transition " +
        (compact ? "px-3 py-3 " : "px-3 py-2 ") +
        (activePath(item.path)
          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white")
      }
    >
      <item.icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  )

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#0b0d10]/95">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center gap-5 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="CEL-TRONICS — strona główna"
        >
          <span className="flex h-11 items-center rounded-md bg-white px-2.5">
            <Image
              src="/assets/logo.svg"
              alt="CEL-TRONICS"
              width={178}
              height={34}
              priority
              className="h-auto w-[150px] sm:w-[178px]"
            />
          </span>
          <span className="hidden border-l border-slate-200 pl-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 xl:block dark:border-slate-700">
            Systemy zabezpieczeń
            <br />
            Siedlce
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {publicItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {mounted ? (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white"
              aria-label="Przełącz motyw"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          ) : null}

          {isAuthenticated ? (
            <>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="hidden min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold sm:flex dark:border-slate-700"
                >
                  <Boxes className="h-4 w-4" />
                  Operacje
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="hidden min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold sm:flex dark:border-slate-700"
                >
                  Strefa partnera
                </Link>
              )}
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:border-red-300 hover:text-red-700 dark:border-slate-700"
                aria-label="Wyloguj"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/logowanie"
              className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950 sm:px-4"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Strefa partnera</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() =>
              setMobileOpenPath((openPath) =>
                openPath === pathname ? null : pathname
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-foreground lg:hidden dark:border-slate-700"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Zamknij menu" : "Otwórz menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-[#0b0d10]">
          <div className="mx-auto grid max-w-[1440px] gap-1">
            {publicItems.map((item) => (
              <NavLink key={item.path} item={item} compact />
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
