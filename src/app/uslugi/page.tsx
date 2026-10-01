import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { PublicPageHeading } from "@/components/public/PublicPageHeading"
import { companyServices } from "@/components/public/public-content"
import p from "@/components/public/pages.module.css"
import s from "@/components/public/public.module.css"

export const metadata: Metadata = {
  title: "Usługi", description: "CEL-TRONICS Siedlce — projektowanie, montaż i serwis alarmów, CCTV, kontroli dostępu, SSP/PPOŻ i instalacji teletechnicznych.", alternates: { canonical: "/uslugi" },
}
const scopes = [
  ["Dobór urządzeń", "Montaż i konfiguracja", "Rozbudowa", "Serwis"],
  ["Kamery IP", "Rejestratory", "Sieć", "Zdalny dostęp"],
  ["Kontrolery", "Czytniki", "Elektrozaczepy", "RCP"],
  ["Centrale", "Detekcja", "Sygnalizacja", "Konserwacja"],
  ["Okablowanie", "Szafy i trasy", "Sieci", "Pomiary"],
  ["Diagnostyka", "Naprawa", "Konserwacja", "Modernizacja"],
]
export default function UslugiPage() {
  return (
    <div className={p.page}>
      <PublicPageHeading eyebrow="Usługi CEL-TRONICS" title={<>Najpierw obiekt.<br />Potem rozwiązanie.</>}>Projektujemy, montujemy i utrzymujemy systemy zabezpieczeń. Zakres prac dopasowujemy do potrzeb obiektu i jego istniejącej infrastruktury.</PublicPageHeading>
      <section className={p.services} aria-label="Zakres usług">
        {companyServices.map((service, index) => <article className={p.service} key={service.code}>
          <span className={p.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div><h2>{service.title}</h2><p>{service.description}</p></div>
          <ul className={p.scope} aria-label={`Zakres: ${service.title}`}>{scopes[index].map((item) => <li key={item}>{item}</li>)}</ul>
        </article>)}
      </section>
      <section className={p.section} aria-labelledby="cooperation-title"><h2 id="cooperation-title">Od rozpoznania do utrzymania.</h2><ol className={p.checklist}><li>Ustalamy potrzeby obiektu, stan instalacji i zakres odpowiedzialności.</li><li>Dobieramy urządzenia, wykonujemy montaż, konfigurację i uruchomienie.</li><li>Diagnozujemy, konserwujemy i rozwijamy instalację po uruchomieniu.</li></ol><p className={p.note}>Serwisujemy również instalacje, których nie wykonywaliśmy. Szczegóły i możliwości ustalamy po rozpoznaniu systemu.</p></section>
      <section className={p.callout}><div><h2>Porozmawiajmy o Twoim obiekcie.</h2><p>Przygotuj rodzaj obiektu, zakres planowanych prac i informacje o obecnej instalacji. To punkt wyjścia do rozmowy i wyceny.</p></div><Link href="/kontakt" className={s.primaryAction}>Skontaktuj się <ArrowUpRight size={20} aria-hidden="true" /></Link></section>
    </div>
  )
}
