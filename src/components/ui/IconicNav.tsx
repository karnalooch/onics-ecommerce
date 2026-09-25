"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  BookOpen,
  Boxes,
  Contact,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Package,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wrench,
  FileText,
} from "lucide-react"

export function IconicNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const isAuthenticated = status === "authenticated"
  const isAdmin = isAuthenticated && (session?.user as any)?.role === "ADMIN"

  useEffect(() => setMounted(true), [])

  const publicItems = [
    { name: "Start", path: "/", icon: Home },
    { name: "Usługi", path: "/#uslugi", icon: ShieldCheck },
    { name: "Katalog", path: "/produkty", icon: BookOpen },
    { name: "Kontakt", path: "/kontakt", icon: Contact },
  ]

  const adminItems = [
    { name: "Pulpit", path: "/admin", icon: LayoutDashboard },
    { name: "Produkty", path: "/admin/products", icon: Package },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Oferty", path: "/admin/quotes", icon: FileText },
    { name: "Serwis", path: "/admin/repairs", icon: Wrench },
    { name: "System", path: "/admin/categories", icon: Settings },
  ]

  const activePath = (path: string) => {
    const plain = path.split("#")[0]
    if (plain === "/") return pathname === "/"
    return pathname.startsWith(plain)
  }

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-black/5 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#161616]/90">
      <div className="mx-auto flex h-[72px] w-full max-w-[1920px] items-center gap-6 px-5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-none">
            <span className="block text-sm font-extrabold tracking-tight text-foreground">CEL-TRONICS</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Systemy zabezpieczeń
            </span>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
          {publicItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                activePath(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}

          {isAdmin &&
            adminItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                  activePath(item.path)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden 2xl:inline">{item.name}</span>
              </Link>
            ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              aria-label="Przełącz motyw"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-[11px] font-extrabold uppercase tracking-wider text-foreground sm:flex dark:border-white/10"
                >
                  <Boxes className="h-4 w-4 text-primary" />
                  Panel
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition hover:bg-red-500 hover:text-white"
                aria-label="Wyloguj"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              href="/logowanie"
              className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Logowanie B2B</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
