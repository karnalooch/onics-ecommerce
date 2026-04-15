"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  PackageSearch, 
  FileSpreadsheet, 
  FileText, 
  Wrench, 
  LogOut,
  ChevronLeft,
  Users,
  FolderTree
} from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Zarządzaj Zamówieniami", path: "/admin/orders", icon: FileSpreadsheet },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Baza Produktów", path: "/admin/products", icon: PackageSearch },
    { name: "Struktura Kategorii", path: "/admin/categories", icon: FolderTree },
    { name: "Generator Ofert", path: "/admin/quotes", icon: FileText },
    { name: "Generator Cenników", path: "/admin/price-lists", icon: FileSpreadsheet },
    { name: "Serwis / RMA", path: "/admin/repairs", icon: Wrench },
  ]

  const isActive = (path: string) => {
    if (path === "/admin" && pathname !== "/admin") return false;
    return pathname.startsWith(path);
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary hover:opacity-80 transition-opacity">
            <ChevronLeft className="h-4 w-4" />
            <img src="/assets/logo.svg" alt="CEL-TRONICS" className="h-6 w-auto dark:invert" />
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between py-4">
          <nav className="grid items-start px-4 text-sm font-medium gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Zarządzanie
            </div>
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <nav className="px-4 mt-auto">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-4 w-4" />
              Wyjdź do Sklepu
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 sm:pl-64 flex flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
          <div className="flex-1">
            <h1 className="text-lg font-semibold capitalize">
              {navItems.find(n => isActive(n.path))?.name || "Panel B2B"}
            </h1>
          </div>
        </header>
        <div className="flex-1 p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
