"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { useRef, useState, type KeyboardEvent } from "react"
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { companyContact, publicNavigation } from "@/components/public/public-content"
import s from "@/components/public/public.module.css"

function NavigationLinks({ pathname, close }: { pathname: string; close?: () => void }) {
  return publicNavigation.map((item) => (
    <Link key={item.href} href={item.href} onClick={close}
      aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ? "page" : undefined}>
      {item.label}
    </Link>
  ))
}

function AccountActions({ close }: { close?: () => void }) {
  const { data: session, status } = useSession()
  if (status === "loading") return <span className={s.accountLoading} role="status">Wczytywanie konta…</span>
  const authenticated = status === "authenticated"
  const role = (session?.user as { role?: string } | undefined)?.role
  const href = authenticated ? (role === "ADMIN" ? "/admin" : "/dashboard") : "/logowanie"
  const label = authenticated && role === "ADMIN" ? "Panel operacyjny" : "Strefa partnera"
  return (
    <div className={s.accountActions}>
      <Link href={href} className={s.partnerAction} onClick={close}>{label}<ArrowUpRight size={17} aria-hidden="true" /></Link>
      {authenticated && <button type="button" className={s.signOut} onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={17} aria-hidden="true" />Wyloguj</button>}
    </div>
  )
}

function HeaderDetails() {
  return <div className={s.topLine}><div className={s.container}><span>Systemy zabezpieczeń / Siedlce</span><a href={companyContact.telephoneHref}>{companyContact.phone}</a><a href={companyContact.emailHref}>{companyContact.email}</a></div></div>
}

export function IconicNav() {
  const pathname = usePathname()
  const [openPath, setOpenPath] = useState<string | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const open = openPath === pathname
  const close = () => setOpenPath(null)
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) { close(); toggle.current?.focus() }
  }
  return (
    <header className={s.header} onKeyDown={onKeyDown}>
      <HeaderDetails />
      <div className={`${s.container} ${s.navBar}`}>
        <Link href="/" aria-label="CEL-TRONICS — strona główna" onClick={close}><BrandLogo className={s.logo} eager /></Link>
        <nav className={s.desktopNavigation} aria-label="Główna nawigacja"><NavigationLinks pathname={pathname} /></nav>
        <div className={s.desktopAccount}><AccountActions /></div>
        <button ref={toggle} type="button" className={s.menuToggle} aria-controls="public-menu" aria-expanded={open} aria-label={open ? "Zamknij menu" : "Otwórz menu"} onClick={() => setOpenPath(open ? null : pathname)}>{open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}<span>Menu</span></button>
      </div>
      <div id="public-menu" className={s.mobilePanel} hidden={!open}>
        <nav className={s.mobileNavigation} aria-label="Nawigacja mobilna"><NavigationLinks pathname={pathname} close={close} /></nav>
        <AccountActions close={close} />
        <a href={companyContact.telephoneHref} className={s.mobilePhone}>Zadzwoń: {companyContact.phone}</a>
      </div>
    </header>
  )
}
