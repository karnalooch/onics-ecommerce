"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserCircle, PackageSearch, ShoppingCart, LogOut, LayoutDashboard, Settings, FileText, HelpCircle, Database, Menu, X } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"

export function HorizontalNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const totalItems = useCartStore((state) => state.getTotalItems())
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { label: "Katalog", href: "/produkty", icon: PackageSearch },
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Oferty", href: "/oferty", icon: FileText },
    { label: "Usługi", href: "/uslugi", icon: Settings },
    { label: "Kontakt", href: "/kontakt", icon: HelpCircle },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-10 bg-slate-900 border-b border-white/5 flex items-center justify-between px-4 shadow-xl select-none no-print font-mono">
      <div className="flex items-center h-full gap-4 lg:gap-8">
        
        {/* BRANDING ELEMENT */}
        <Link href="/" className="flex items-center gap-2 border-r border-white/10 pr-6 h-full hover:bg-white/5 transition-colors">
          <div className="w-5 h-5 bg-primary text-slate-900 flex items-center justify-center rounded-sm shrink-0">
             <Database className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-white truncate max-w-[120px] sm:max-w-none">
            Celtronics <span className="text-primary NOT-italic">B2B</span>
          </span>
        </Link>

        {/* DESKTOP NAV ITEMS */}
        <div className="hidden lg:flex items-center h-full">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className={`
                h-full px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-snap ease-snap border-b-2
                ${isActive(item.href) 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"}
              `}
            >
              <item.icon className={`w-3.5 h-3.5 ${isActive(item.href) ? 'text-primary' : 'text-slate-500'}`} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT UTILITIES */}
      <div className="flex items-center h-full">
        {/* CART LINK */}
        <Link 
          href="/koszyk" 
          className={`
            h-full px-5 border-l border-white/10 flex items-center gap-2 transition-all
            ${isActive('/koszyk') ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-slate-400 hover:text-white hover:bg-white/5"}
          `}
        >
          <ShoppingCart className="w-4 h-4" />
          {mounted && totalItems > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-slate-900 text-[8px] font-black rounded-xs">
              {totalItems}
            </span>
          )}
        </Link>

        {/* AUTH SECTION */}
        <div className="h-full border-l border-white/10 flex items-center">
          {session?.user ? (
             <div className="flex items-center h-full">
                <span className="hidden md:flex h-full items-center px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10">
                  {session.user.email?.split('@')[0]}
                </span>
                <button 
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="h-full px-5 flex items-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest">Wyloguj</span>
                </button>
             </div>
          ) : (
            <Link 
              href="/logowanie" 
              className="h-full px-6 flex items-center gap-2 bg-primary text-slate-900 hover:brightness-110 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <UserCircle className="w-4 h-4" />
              <span>B2B Login</span>
            </Link>
          )}
        </div>

        {/* MOBILE TRIGGER */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden h-full px-4 text-slate-400 hover:text-primary transition-colors border-l border-white/10"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      <div 
        className={`fixed inset-0 z-[110] bg-slate-950 lg:hidden transition-all duration-300 ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
      >
        <div className="flex flex-col p-6 pt-16 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 p-4 rounded-xs border transition-all ${isActive(item.href) ? 'bg-primary border-primary text-slate-900 font-black' : 'bg-white/5 border-white/10 text-slate-400'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] uppercase tracking-[0.2em]">{item.label}</span>
            </Link>
          ))}
          <div className="pt-8 border-t border-white/10 mt-6 md:hidden">
             <button onClick={() => setIsMobileMenuOpen(false)} className="text-[10px] font-black uppercase text-slate-500 underline underline-offset-4">Zamknij Menu</button>
          </div>
        </div>
      </div>
    </nav>
  )
}
