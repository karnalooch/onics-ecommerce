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
  FolderTree,
  Brain
} from "lucide-react"
import { KnowledgeProvider } from "@/lib/knowledge/KnowledgeContext"
import { GlobalKnowledgeIndicator } from "@/components/knowledge/GlobalKnowledgeIndicator"
import { GlobalTrainingModal } from "@/components/knowledge/GlobalTrainingModal"

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
    { name: "Katalog & Wiedza", path: "/admin/catalog", icon: PackageSearch },
    { name: "Generator Ofert", path: "/admin/quotes", icon: FileText },
    { name: "Generator Cenników", path: "/admin/price-lists", icon: FileSpreadsheet },
    { name: "Serwis / RMA", path: "/admin/repairs", icon: Wrench },
  ]

  const isActive = (path: string) => {
    if (path === "/admin" && pathname !== "/admin") return false;
    return pathname.startsWith(path);
  }

  return (
    <KnowledgeProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-68 flex-col border-r bg-card shadow-[20px_0_40px_-15px_rgba(0,0,0,0.05)] sm:flex">
        <div className="flex h-20 items-center border-b px-8 bg-muted/20">
          <Link href="/" className="flex items-center gap-3 font-black text-primary hover:opacity-80 transition-all group">
            <div className="bg-primary p-1.5 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
              <ChevronLeft className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl tracking-tighter uppercase font-black italic">Celtronics <span className="text-accent underline decoration-4 underline-offset-4">Admin</span></span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between py-6 overflow-y-auto custom-scrollbar">
          <nav className="grid items-start px-4 text-sm font-semibold gap-1.5">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 px-4 flex items-center gap-2">
              <div className="h-px bg-border flex-1"></div>
              Zarządzanie
              <div className="h-px bg-border w-4"></div>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 font-bold ${
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] translate-x-1"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                }`}
              >
                <div className={`p-1.5 rounded-md ${isActive(item.path) ? "bg-white/20" : "bg-background border border-border/50 shadow-sm"}`}>
                  <item.icon className={`h-4 w-4 ${isActive(item.path) ? "text-white" : "text-muted-foreground"}`} />
                </div>
                {item.name}
              </Link>
            ))}
          </nav>

          <nav className="px-4 mt-auto">
            <div className="bg-card rounded-2xl p-4 border border-border mb-4 shadow-sm">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">AD</div>
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-tighter">System Admin</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Wersja 2.0 (2026)</p>
                  </div>
               </div>
            </div>
            <Link
              href="/"
              className="flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-black text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-transparent hover:border-border"
            >
              <LogOut className="h-4 w-4" />
              Wyjdź do Sklepu
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-68 flex flex-col bg-muted/20 min-h-screen relative">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-10 shadow-sm">
          <div className="flex-1" suppressHydrationWarning>
            <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
              {navItems.find(n => isActive(n.path))?.name || "Panel B2B"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Status</span>
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
                   Serwer Węzła
                </span>
             </div>
             <GlobalKnowledgeIndicator />
          </div>
        </header>
        <div className="flex-1 p-6 lg:p-10 relative z-10">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </div>
      </main>
      <GlobalTrainingModal />
    </div>
    </KnowledgeProvider>
  )
}
