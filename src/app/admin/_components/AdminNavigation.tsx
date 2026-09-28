"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Boxes,
  CreditCard,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Settings,
  Tags,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: "Praca",
    items: [
      { href: "/admin", label: "Operacje", icon: ListChecks, exact: true },
    ],
  },
  {
    label: "Sprzedaż",
    items: [
      { href: "/admin/orders", label: "Zamówienia", icon: FileText },
      { href: "/admin/quotes", label: "Oferty", icon: FileSpreadsheet },
      { href: "/admin/payments", label: "Płatności", icon: CreditCard },
      { href: "/admin/price-lists", label: "Cenniki", icon: Tags },
    ],
  },
  {
    label: "Katalog i dane",
    items: [
      { href: "/admin/products", label: "Produkty", icon: Boxes },
      { href: "/admin/categories", label: "Kategorie", icon: Settings },
      { href: "/admin/knowledge", label: "Wiedza", icon: BookOpen },
    ],
  },
  {
    label: "Obsługa",
    items: [
      { href: "/admin/clients", label: "Partnerzy", icon: Users },
      { href: "/admin/repairs", label: "Serwis", icon: Wrench },
    ],
  },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href)
}

export function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    const items = groups.flatMap((group) => group.items)
    return (
      <nav
        aria-label="Nawigacja administracyjna"
        className="flex gap-1 overflow-x-auto px-3 py-2"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.exact)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium " +
                (active
                  ? "bg-slate-950 text-white"
                  : "text-slate-700 hover:bg-[#f1f1ee]")
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Nawigacja administracyjna" className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {group.label}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 text-[15px] font-medium transition-colors " +
                    (active
                      ? "border-primary bg-[#f4eeee] text-slate-950"
                      : "border-transparent text-slate-700 hover:bg-[#f2f2ef] hover:text-slate-950")
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
