import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUpRight, Phone } from "lucide-react"
import { companyContact, companyServices } from "./public-content"
import s from "./public.module.css"

function HeroStatement() {
  return (
    <div className={s.heroCopy}>
      <p className={s.eyebrow}>CEL-TRONICS / Siedlce</p>
      <h1 className={s.heroTitle}>Systemy zabezpieczeń.<br /><span>Od projektu<br />do serwisu.</span></h1>
      <p className={s.heroLead}>Alarmy, monitoring, kontrola dostępu i instalacje teletechniczne. Dobieramy rozwiązanie do obiektu, a nie odwrotnie.</p>
      <div className={s.actions}>
        <Link href="/kontakt" className={s.primaryAction}>Omów instalację <ArrowUpRight size={20} aria-hidden="true" /></Link>
        <a href="#zakres-prac" className={s.textAction}>Poznaj nasze rozwiązania <ArrowDown size={18} aria-hidden="true" /></a>
      </div>
      <p className={s.heroAudience}>Dla firm, instytucji i klientów indywidualnych.</p>
    </div>
  )
}

function ServiceStatement() {
  return (
    <aside className={s.statement} aria-label="Kompleksowa obsługa instalacji">
      <p className={s.statementLabel}>Jeden partner. Cała instalacja.</p>
      <div className={s.statementWords} aria-hidden="true"><span>Projekt.</span><span>Montaż.</span><span>Serwis.</span></div>
      <p className={s.statementNote}>Od rozpoznania potrzeb i uruchomienia systemu po jego utrzymanie.</p>
      <Link href="/uslugi" className={s.inverseLink}>Zobacz zakres usług <ArrowUpRight size={22} aria-hidden="true" /></Link>
    </aside>
  )
}

function Services() {
  return (
    <section id="zakres-prac" className={`${s.container} ${s.section}`} aria-labelledby="services-title">
      <div className={s.sectionHeading}>
        <p className={s.eyebrow}>Zakres prac</p>
        <h2 id="services-title">Dobrze dobrane urządzenia.<br />Przemyślany system.</h2>
        <p>Nowa instalacja, modernizacja czy naprawa? Zaczynamy od tego, czego potrzebuje Twój obiekt.</p>
      </div>
      <div className={s.serviceList}>
        {companyServices.map((service, index) => (
          <article key={service.code} className={s.serviceRow}>
            <span className={s.serviceNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <h3>{service.title}</h3><p>{service.description}</p><span className={s.serviceCode}>{service.code}</span>
          </article>
        ))}
      </div>
      <Link href="/uslugi" className={s.textAction}>Pełny zakres usług <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  )
}

function PartnerSection() {
  return (
    <section className={s.partnerSection} aria-labelledby="partner-title">
      <div className={`${s.container} ${s.partnerGrid}`}>
        <div><p className={s.eyebrow}>Dla partnerów i instalatorów</p><h2 id="partner-title">Sprzęt do kolejnej<br />realizacji.</h2></div>
        <div>
          <p className={s.partnerLead}>Katalog urządzeń, warunki Twojego konta, zamówienia i obsługa serwisowa — w strefie partnera CEL-TRONICS.</p>
          <p className={s.bodyNote}>Ceny i warunki handlowe zależą od uprawnień oraz zatwierdzenia konta.</p>
          <div className={s.actions}>
            <Link href="/produkty" className={s.primaryAction}>Przejdź do katalogu <ArrowUpRight size={19} aria-hidden="true" /></Link>
            <Link href="/logowanie" className={s.textAction}>Strefa partnera <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section className={`${s.container} ${s.contactSection}`} aria-labelledby="contact-title">
      <div><p className={s.eyebrow}>Porozmawiajmy</p><h2 id="contact-title">Masz obiekt.<br />Ustalmy, czego potrzebuje.</h2></div>
      <div className={s.contactActions}>
        <a href={companyContact.telephoneHref} className={s.phoneAction}><Phone size={24} aria-hidden="true" />{companyContact.phone}</a>
        <a href={companyContact.emailHref} className={s.textAction}>{companyContact.email} <ArrowUpRight size={18} aria-hidden="true" /></a>
        <Link href="/kontakt" className={s.textAction}>Dane firmy i kontakt <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
    </section>
  )
}

export function PublicHome() {
  return (
    <>
      <section className={`${s.container} ${s.hero}`} aria-label="Systemy zabezpieczeń CEL-TRONICS"><HeroStatement /><ServiceStatement /></section>
      <div className={s.locationStrip}><div className={s.container}><span>Siedlce, ul. Niklowa 22</span><span>Projektowanie · montaż · serwis</span><a href={companyContact.telephoneHref}>{companyContact.phone}</a></div></div>
      <Services /><PartnerSection /><ContactSection />
    </>
  )
}
