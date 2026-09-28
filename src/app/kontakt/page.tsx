import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Wrench,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontakt z CEL-TRONICS S.C. w Siedlcach — nowe instalacje, modernizacje, serwis systemów zabezpieczeń i obsługa B2B.",
  alternates: { canonical: "/kontakt" },
}

const topics = [
  {
    title: "Nowa instalacja",
    description:
      "Alarm, CCTV, kontrola dostępu, SSP/PPOŻ lub infrastruktura teletechniczna.",
    icon: ShieldCheck,
  },
  {
    title: "Modernizacja",
    description:
      "Rozbudowa, wymiana urządzeń, integracja i dostosowanie istniejącego systemu.",
    icon: RefreshCw,
  },
  {
    title: "Serwis",
    description:
      "Diagnostyka usterek, naprawa, konserwacja i przywracanie poprawnego działania.",
    icon: Wrench,
  },
  {
    title: "Obsługa partnera",
    description:
      "Katalog, warunki handlowe, zamówienia i pytania dotyczące współpracy B2B.",
    icon: ShoppingBag,
  },
]

export default function KontaktPage() {
  return (
    <div className="bg-[#f6f6f3]">
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-7 lg:py-16">
        <header className="grid gap-8 border-b border-[#d9dbdc] pb-9 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="text-base font-semibold text-primary">Kontakt</p>
            <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-5xl">
              Powiedz, czego potrzebuje obiekt albo instalacja.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Nowa realizacja, modernizacja, awaria czy obsługa partnera — zacznij od
              telefonu lub wiadomości. Skierujemy temat do właściwej ścieżki.
            </p>
          </div>

          <div className="space-y-4 border-l-2 border-primary pl-5">
            <a href="tel:+48256336800" className="flex items-start gap-3 text-slate-900 hover:text-primary">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <span>
                <strong className="block text-xl font-semibold">25 633 68 00</strong>
                <span className="mt-1 block text-sm text-slate-600">telefon do CEL-TRONICS</span>
              </span>
            </a>
            <a href="mailto:serwis@celtronics.pl" className="flex items-start gap-3 text-slate-900 hover:text-primary">
              <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <span>
                <strong className="block text-base font-semibold">serwis@celtronics.pl</strong>
                <span className="mt-1 block text-sm text-slate-600">zapytania techniczne i serwis</span>
              </span>
            </a>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <h2 className="text-2xl font-semibold text-slate-950">Z czym się kontaktujesz?</h2>
            <div className="mt-5 border border-[#d9dbdc] bg-white">
              {topics.map((topic) => (
                <article
                  key={topic.title}
                  className="grid gap-4 border-b border-[#e0e1e1] p-5 last:border-b-0 sm:grid-cols-[44px_180px_minmax(0,1fr)] sm:items-start"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4eeee] text-primary">
                    <topic.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-950">{topic.title}</h3>
                  <p className="text-[15px] leading-6 text-slate-600">{topic.description}</p>
                </article>
              ))}
            </div>

            <section className="mt-8">
              <h2 className="text-2xl font-semibold text-slate-950">Co warto przygotować?</h2>
              <ol className="mt-5 divide-y divide-[#d9dbdc] border-y border-[#d9dbdc]">
                {[
                  ["01", "Rodzaj obiektu", "Dom, firma, hala, biuro, instytucja lub inny typ obiektu oraz przybliżona wielkość."],
                  ["02", "Cel kontaktu", "Nowy system, rozbudowa, naprawa, przegląd albo pytanie o sprzęt."],
                  ["03", "Stan obecny", "Jeżeli instalacja już działa, podaj producenta, model albo krótko opisz problem."],
                ].map(([index, title, description]) => (
                  <li key={index} className="grid gap-2 py-4 sm:grid-cols-[48px_170px_minmax(0,1fr)]">
                    <span className="font-mono text-sm font-semibold text-primary">{index}</span>
                    <strong className="text-[15px] font-semibold text-slate-950">{title}</strong>
                    <span className="text-[15px] leading-6 text-slate-600">{description}</span>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          <aside className="h-fit rounded-xl border border-[#d9dbdc] bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">CEL-TRONICS S.C.</h2>
            <div className="mt-5 space-y-5 text-[15px]">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <strong className="block font-semibold text-slate-900">Adres</strong>
                  <span className="mt-1 block leading-6 text-slate-600">ul. Niklowa 22<br />08-110 Siedlce</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <strong className="block font-semibold text-slate-900">Telefon</strong>
                  <a href="tel:+48256336800" className="mt-1 block text-slate-600 hover:text-primary">25 633 68 00</a>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <strong className="block font-semibold text-slate-900">E-mail</strong>
                  <a href="mailto:serwis@celtronics.pl" className="mt-1 block text-slate-600 hover:text-primary">serwis@celtronics.pl</a>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-2">
              <a href="tel:+48256336800" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-[15px] font-semibold text-white hover:bg-[#a9161c]">
                Zadzwoń
              </a>
              <a href="mailto:serwis@celtronics.pl" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d5d7d8] px-4 text-[15px] font-semibold text-slate-800">
                Napisz e-mail
              </a>
            </div>
          </aside>
        </div>

        <div className="mt-8">
          <Link href="/produkty" className="inline-flex items-center gap-2 text-[15px] font-semibold text-primary">
            Szukasz produktów lub cen B2B? Przejdź do katalogu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
