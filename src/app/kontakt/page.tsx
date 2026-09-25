import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
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
    title: "Katalog B2B",
    description:
      "Dostęp do oferty produktowej i obsługi partnerów handlowych.",
    icon: ShoppingBag,
  },
]

export default function KontaktPage() {
  return (
    <div className="px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-[1440px]">
        <section className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr] lg:gap-16">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
              Kontakt
            </span>
            <h1 className="mt-4 max-w-4xl text-5xl font-extrabold leading-[1.03] tracking-[-0.045em] sm:text-6xl">
              Porozmawiajmy o Twoim obiekcie.
            </h1>
            <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-muted-foreground">
              Jeśli planujesz nową instalację, modernizację istniejącego systemu albo
              potrzebujesz serwisu — zacznij od krótkiej rozmowy. Dobierzemy właściwą
              ścieżkę i zakres dalszych działań.
            </p>
          </div>

          <div className="rounded-[24px] bg-[#102033] p-7 text-white shadow-2xl">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-300">
              Najszybszy kontakt
            </span>
            <div className="mt-6 border-t border-white/10 pt-5">
              <a href="tel:+48256336800" className="group flex items-center justify-between gap-4">
                <div>
                  <strong className="block text-2xl">25 633 68 00</strong>
                  <span className="mt-1 block text-sm text-slate-300">telefon do CEL-TRONICS</span>
                </div>
                <Phone className="h-5 w-5 text-blue-300 transition group-hover:scale-110" />
              </a>
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <a
                href="mailto:serwis@celtronics.pl"
                className="group flex items-center justify-between gap-4"
              >
                <div>
                  <strong className="block text-lg sm:text-xl">serwis@celtronics.pl</strong>
                  <span className="mt-1 block text-sm text-slate-300">
                    zapytania techniczne i serwis
                  </span>
                </div>
                <Mail className="h-5 w-5 text-blue-300 transition group-hover:scale-110" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.12fr_.88fr]">
          <div className="rounded-[24px] border border-black/5 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-9">
            <h2 className="text-3xl font-extrabold tracking-tight">Z czym możemy pomóc?</h2>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-muted-foreground">
              Wybierz temat — dzięki temu łatwiej od razu skierować rozmowę do właściwej osoby.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {topics.map((topic) => (
                <article key={topic.title} className="rounded-2xl border border-black/5 p-5 dark:border-white/10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <topic.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold">{topic.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                    {topic.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-primary p-7 text-white shadow-2xl shadow-primary/20 sm:p-9">
            <Building2 className="h-8 w-8 text-blue-100" />
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight">CEL-TRONICS S.C.</h2>
            <p className="mt-3 text-base font-medium leading-7 text-blue-100">
              Siedlecka firma instalacyjna i serwisowa. Zapraszamy do kontaktu
              telefonicznego lub mailowego.
            </p>

            <div className="mt-8 space-y-6">
              <div className="border-t border-white/20 pt-5">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-100" />
                  <div>
                    <strong className="block">Adres</strong>
                    <span className="mt-1 block text-sm leading-6 text-blue-100">
                      ul. Niklowa 22<br />08-110 Siedlce
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/20 pt-5">
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-blue-100" />
                  <div>
                    <strong className="block">Telefon</strong>
                    <a href="tel:+48256336800" className="mt-1 block text-sm text-blue-100 hover:text-white">
                      25 633 68 00
                    </a>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/20 pt-5">
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-blue-100" />
                  <div>
                    <strong className="block">E-mail</strong>
                    <a
                      href="mailto:serwis@celtronics.pl"
                      className="mt-1 block text-sm text-blue-100 hover:text-white"
                    >
                      serwis@celtronics.pl
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:+48256336800"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-primary"
              >
                Zadzwoń teraz
                <Phone className="h-4 w-4" />
              </a>
              <a
                href="mailto:serwis@celtronics.pl"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-extrabold text-white"
              >
                Napisz e-mail
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-black/5 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-9">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Co warto przygotować przed kontaktem?
          </h2>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Rodzaj obiektu", "Dom, firma, hala, biuro, instytucja lub obiekt specjalny — i przybliżona wielkość."],
              ["02", "Cel", "Nowy system, rozbudowa, naprawa albo przegląd istniejącej instalacji."],
              ["03", "Stan obecny", "Jeśli system już działa, podaj producenta lub krótko opisz problem. Zdjęcia też pomagają."],
            ].map(([index, title, description]) => (
              <div key={index} className="rounded-2xl bg-black/[0.025] p-5 dark:bg-white/[0.04]">
                <span className="text-xs font-extrabold text-primary">{index}</span>
                <h3 className="mt-3 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <Link
            href="/produkty"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-primary"
          >
            Szukasz produktów lub cen B2B? Przejdź do katalogu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
