"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Boxes,
  CreditCard,
  FileText,
  ListChecks,
  Settings,
  Users,
  Wrench,
} from "lucide-react"

const items = [
  { href: "/admin", label: "Operacje", icon: ListChecks, exact: true },
  { href: "/admin/products", label: "Katalog", icon: Boxes },
  { href: "/admin/knowledge", label: "Wiedza", icon: BookOpen },
  { href: "/admin/clients", label: "Klienci", icon: Users },
  { href: "/admin/orders", label: "Zamówienia", icon: FileText },
  { href: "/admin/payments", label: "Płatności", icon: CreditCard },
  { href: "/admin/repairs", label: "Serwis", icon: Wrench },
  { href: "/admin/categories", label: "Struktura", icon: Settings },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Nawigacja administracyjna"
      className={mobile ? "flex gap-1 overflow-x-auto px-3 py-2" : "flex flex-col gap-1"}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        const base = mobile
          ? "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold "
          : "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors "
        const state = active
          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={base + state}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
