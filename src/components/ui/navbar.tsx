"use client"
import Link from "next/link"

import { usePathname } from "next/navigation"
import { UserCircle, PackageSearch, ShoppingCart, LogOut } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useEffect, useState } from "react"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { useSession, signOut } from "next-auth/react"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const totalItems = useCartStore((state) => state.getTotalItems())
  const [mounted, setMounted] = useState(false)

  // Hydratacyjne obejście dla Zustand i Next.js
  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (path: string) => {
    return pathname === path 
      ? "text-primary font-bold bg-primary/5 px-3 py-1.5 rounded-md" 
      : "text-muted-foreground hover:text-foreground font-medium hover:bg-muted/50 px-3 py-1.5 rounded-md transition-all"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-8 justify-between">
        <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
           <img src="/assets/logo.svg" alt="Celtronics" className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex gap-2 items-center flex-1 ml-10">
          <Link href="/produkty" className={`flex items-center gap-2 text-sm ${isActive('/produkty')}`}>
            <PackageSearch className="w-4 h-4" /> B2C Katalog (ISR)
          </Link>
          <Link href="/oferty" className={`text-sm ${isActive('/oferty')}`}>
            Panel B2B
          </Link>
          <Link href="/polityka-prywatnosci" className={`text-sm ${isActive('/polityka-prywatnosci')}`}>
            O Firmie / KSeF
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <Link href="/koszyk" className="relative flex items-center justify-center w-9 h-9 rounded-md border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
            <ShoppingCart className="w-4 h-4" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>
          {session?.user ? (
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 border border-border/50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600/5 transition-all ml-2"
            >
              <LogOut className="w-4 h-4" /> Wyloguj
            </button>
          ) : (
            <Link href="/logowanie" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm ml-2">
              <UserCircle className="w-4 h-4" /> Panel B2B
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
