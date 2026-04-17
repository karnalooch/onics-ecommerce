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
    return pathname === path ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary transition-colors"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 justify-between" suppressHydrationWarning bis_skin_checked={undefined}>
        <Link href="/" className="flex items-center gap-2">
          <img src="/assets/logo.svg" alt="Celtronics" className="h-10 w-auto" />
        </Link>
        <nav className="hidden md:flex gap-6 items-center flex-1 ml-10">
          <Link href="/produkty" className={`flex items-center gap-2 text-sm ${isActive('/produkty')}`}>
            <PackageSearch className="w-4 h-4" /> B2C Katalog (ISR)
          </Link>
          <Link href="/oferty" className={`text-sm ${isActive('/oferty')}`}>
            Panel B2B (Oferty Netto)
          </Link>
          <Link href="/polityka-prywatnosci" className={`text-sm ${isActive('/polityka-prywatnosci')}`}>
            O Firmie / KSeF
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <ModeToggle />
          <Link href="/koszyk" className="relative flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-2 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Link>
          {session?.user ? (
            <button 
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 bg-rose-500/10 text-rose-600 px-4 py-2 rounded-md text-sm font-bold hover:bg-rose-500/20 transition-all border border-rose-200"
            >
              <LogOut className="w-4 h-4" /> Wyloguj
            </button>
          ) : (
            <Link href="/logowanie" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              <UserCircle className="w-4 h-4" /> Strefa Instalatora
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
