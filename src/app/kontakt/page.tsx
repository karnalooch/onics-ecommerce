import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import { companyContact } from "@/components/public/public-content"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"

export const metadata: Metadata = { title: "Kontakt", description: "Kontakt z CEL-TRONICS w Siedlcach — instalacje, modernizacje, serwis i współpraca partnerska.", alternates: { canonical: "/kontakt" } }
const topics = [
  ["Nowa instalacja", "Alarm, monitoring, kontrola dostępu, SSP/PPOŻ albo infrastruktura teletechniczna."],
  ["Modernizacja", "Rozbudowa systemu, wymiana urządzeń lub integracja istniejącej instalacji."],
  ["Serwis", "Opisz usterkę, producenta i model urządzenia. Nie przesyłaj haseł ani kodów dostępu."],
  ["Współpraca partnerska", "Dostęp do katalogu, warunki firmy, zamówienia i obsługa partnera."],
] as const

function CompanyDetails() {
  return <aside className={p.aside} aria-label="Dane kontaktowe firmy"><h2>CEL-TRONICS S.C.</h2><address><MapPin size={20} aria-hidden="true" />ul. Niklowa 22<br />08-110 Siedlce</address><a href={companyContact.telephoneHref}><Phone size={20} aria-hidden="true" />{companyContact.phone}</a><a href={companyContact.emailHref}><Mail size={20} aria-hidden="true" />{companyContact.email}</a><a href="https://www.google.com/maps/dir/?api=1&destination=Niklowa+22%2C+08-110+Siedlce">Wyznacz trasę <ArrowUpRight size={18} aria-hidden="true" /></a><p>Przed wizytą zadzwoń, aby ustalić dogodny termin i zakres sprawy.</p></aside>
}
export default function KontaktPage() {
  return <div className={p.page}>
    <PublicPageHeading eyebrow="Kontakt" title={<>Zacznijmy<br />od rozmowy.</>}>Nowa instalacja, modernizacja, awaria czy współpraca partnerska? Zadzwoń lub napisz do CEL-TRONICS — wybierz temat, który najlepiej opisuje Twoją sprawę.</PublicPageHeading>
    <div className={p.split}>
      <section aria-label="Tematy kontaktu">{topics.map(([title, description]) => <a key={title} className={p.topic} href={`${companyContact.emailHref}?subject=${encodeURIComponent(title)}`}><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight size={22} aria-hidden="true" /></a>)}<p className={p.note}>Wybór tematu otwiera Twój program pocztowy. Wiadomość nie jest wysyłana automatycznie.</p></section>
      <CompanyDetails />
    </div>
    <section className={p.section}><h2>Co warto przygotować?</h2><ol className={p.checklist}><li>Rodzaj i przybliżoną wielkość obiektu.</li><li>Cel kontaktu: nowy system, rozbudowa, naprawa lub pytanie o urządzenie.</li><li>Producenta, model i krótki opis problemu, gdy instalacja już działa.</li></ol></section>
    <section className={p.callout}><div><h2>Masz już konto partnera?</h2><p>Zaloguj się, aby sprawdzić katalog, zamówienia i obsługę serwisową swojej firmy.</p></div><Link href="/logowanie" className={s.primaryAction}>Strefa partnera <ArrowUpRight size={20} aria-hidden="true" /></Link></section>
  </div>
}
