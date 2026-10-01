"use client"

import { usePathname } from "next/navigation"
import { IconicNav } from "@/components/ui/IconicNav"
import { PublicFooter } from "@/components/public/PublicFooter"
import s from "@/components/public/public.module.css"

function isOperationalSurface(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/field") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/oferty") ||
    pathname.startsWith("/ustawienia")
  )
}

// The tallest public header is 128px; leave 16px clearance for native skip navigation.
const publicAnchorClearance = 144

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (isOperationalSurface(pathname)) return <>{children}</>
  return (
    <div className={s.surface}>
      <a href="#public-content" className={s.skipLink}>Przejdź do treści</a>
      <IconicNav />
      <main id="public-content" className={s.main} tabIndex={-1} style={{ scrollMarginTop: publicAnchorClearance }}>{children}</main>
      <PublicFooter />
    </div>
  )
}
