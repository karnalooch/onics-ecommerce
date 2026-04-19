"use client"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { UserCircle, PackageSearch, ShoppingCart, LogOut } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useEffect, useState } from "react"
import { AtmosphereToggle } from "@/components/ui/AtmosphereToggle"
import { useSession, signOut } from "next-auth/react"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const totalItems = useCartStore((state) => state.getTotalItems())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (path: string) => {
    return pathname === path 
      ? "text-primary font-black bg-primary/10 px-4 py-2 rounded-xl" 
      : "text-slate-400 hover:text-slate-900 dark:hover:text-white font-black hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-all"
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#99% 0.005 250]/80 dark:bg-[#8% 0.02 240]/80 backdrop-blur-3xl border-b border-white/20 dark:border-slate-800/40">
      <div className="container mx-auto flex h-20 items-center px-6 md:px-12 justify-between max-w-[2000px]">
        
        <div className="flex items-center gap-12 flex-1">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
             {/* SIMULATED V12 PRESTIGE LOGO */}
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
                   <PackageSearch className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-black uppercase tracking-tighter italic dark:text-white">Celtronics <span className="text-primary italic">B2B</span></span>
             </div>
          </Link>

          <nav className="hidden xl:flex gap-4 items-center">
            <Link href="/produkty" className={`flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] italic ${isActive('/produkty')}`}>
               B2C Katalog
            </Link>
            <Link href="/oferty" className={`text-[10px] uppercase tracking-[0.2em] italic ${isActive('/oferty')}`}>
               Panel B2B
            </Link>
            <Link href="/polityka-prywatnosci" className={`text-[10px] uppercase tracking-[0.2em] italic ${isActive('/polityka-prywatnosci')}`}>
               System KSeF
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-8">
          {/* THE ATMOSPHERE ENGINE */}
          <AtmosphereToggle />

          <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-8">
            <Link href="/koszyk" className="relative flex items-center justify-center w-12 h-12 rounded-2xl glass-card transition-all hover:scale-110 active:scale-95">
              <ShoppingCart className="w-5 h-5 text-slate-500" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-[9px] font-black text-white shadow-ks-sm">
                  {totalItems}
                </span>
              )}
            </Link>

            {session?.user ? (
              <button 
                onClick={() => signOut({ callbackUrl: "/" })}
                className="h-12 px-6 rounded-2xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-3"
              >
                <LogOut className="w-4 h-4" /> Exit Terminal
              </button>
            ) : (
              <Link href="/logowanie" className="h-12 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:translate-y-[-2px] transition-all shadow-ks-md flex items-center gap-3 hover:bg-primary dark:hover:bg-primary hover:text-white">
                <UserCircle className="w-4 h-4" /> B2B Auth
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
