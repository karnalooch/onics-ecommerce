import Link from "next/link"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { companyContact, publicNavigation } from "./public-content"
import s from "./public.module.css"

export function PublicFooter() {
  return (
    <footer className={s.footer}>
      <div className={`${s.container} ${s.footerGrid}`}>
        <div><Link href="/" aria-label="CEL-TRONICS — strona główna"><BrandLogo className={s.footerLogo} /></Link><p>P.U.H. CEL-TRONICS S.C.</p><p>Systemy zabezpieczeń i obsługa techniczna.</p></div>
        <nav aria-label="Nawigacja w stopce"><p className={s.footerLabel}>CEL-TRONICS</p>{publicNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
        <div><p className={s.footerLabel}>Kontakt</p><address>{companyContact.address}</address><a href={companyContact.telephoneHref}>{companyContact.phone}</a><a href={companyContact.emailHref}>{companyContact.email}</a></div>
      </div>
      <div className={`${s.container} ${s.footerBottom}`}><span>© CEL-TRONICS</span><Link href="/logowanie">Strefa partnera</Link></div>
    </footer>
  )
}
