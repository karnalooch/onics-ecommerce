import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  Camera,
  Cable,
  DoorOpen,
  Flame,
  Phone,
  Wrench,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Usługi",
  description:
    "CEL-TRONICS Siedlce — projektowanie, montaż, uruchomienie i serwis systemów alarmowych, CCTV, kontroli dostępu, SSP/PPOŻ i instalacji teletechnicznych.",
  alternates: { canonical: "/uslugi" },
}

const services = [
  {
    title: "Systemy alarmowe",
    code: "SSWiN",
    icon: BellRing,
    description:
      "Projektujemy i wykonujemy systemy sygnalizacji włamania i napadu dla domów, firm, instytucji i obiektów przemysłowych.",
    scope: ["dobór urządzeń", "montaż i konfiguracja", "rozbudowa", "serwis"],
  },
  {
    title: "Monitoring wizyjny",
    code: "CCTV",
    icon: Camera,
    description:
      "Kamery, rejestracja, sieć i zdalny dostęp projektowane jako jeden system, z naciskiem na czytelny obraz i późniejszy serwis.",
    scope: ["kamery IP", "rejestratory", "sieć", "zdalny dostęp"],
  },
  {
    title: "Kontrola dostępu",
    code: "KD / RCP",
    icon: DoorOpen,
    description:
      "Kontrola przejść, identyfikacja użytkowników i rejestracja czasu pracy z integracją z pozostałymi warstwami zabezpieczeń.",
    scope: ["kontrolery", "czytniki", "elektrozaczepy", "RCP"],
  },
  {
    title: "Systemy przeciwpożarowe",
    code: "SSP / PPOŻ",
    icon: Flame,
    description:
      "Systemy wykrywania pożaru i rozwiązania wspierające alarmowanie, reakcję oraz bezpieczną ewakuację.",
    scope: ["centrale", "detekcja", "sygnalizacja", "konserwacja"],
  },
  {
    title: "Instalacje teletechniczne",
    code: "INFRASTRUKTURA",
    icon: Cable,
    description:
      "Okablowanie i infrastruktura przygotowane pod stabilną pracę systemów bezpieczeństwa, sieci i urządzeń technicznych.",
    scope: ["okablowanie", "szafy i trasy", "sieci", "pomiary"],
  },
  {
    title: "Serwis i modernizacje",
    code: "SERWIS",
    icon: Wrench,
    description:
      "Diagnostyka usterek, naprawy, przeglądy i rozbudowa istniejących instalacji — także wtedy, gdy system nie był wykonywany przez nas.",
    scope: ["diagnostyka", "naprawa", "konserwacja", "modernizacja"],
  },
]

export default function UslugiPage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-[1440px]">
        <header className="grid gap-8 border-b border-slate-200 pb-10 dark:border-slate-800 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              CEL-TRONICS · Siedlce
            </div>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Projekt, montaż i serwis systemów zabezpieczeń.
            </h1>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-500">
            Bierzemy odpowiedzialność za cały cykl instalacji: od rozpoznania
            obiektu i projektu, przez wykonanie i uruchomienie, po serwis i
            modernizację.
          </p>
        </header>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1216]">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {services.map((service) => (
              <article
                key={service.code}
                className="grid gap-5 p-5 lg:grid-cols-[180px_minmax(0,1fr)_320px] lg:items-center"
              >
                <div>
                  <service.icon className="h-5 w-5 text-slate-500" />
                  <div className="mt-3 font-mono text-xs font-semibold text-slate-500">
                    {service.code}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold">
                    {service.title}
                  </h2>
                </div>

                <p className="text-sm leading-6 text-slate-500">
                  {service.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {service.scope.map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-white/[0.03]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Potrzebujesz wyceny albo konsultacji?
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              Zacznijmy od obiektu, nie od listy urządzeń.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Opisz miejsce, zakres prac i stan obecnej instalacji. Dobierzemy
              dalszą ścieżkę i potrzebne rozwiązania.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Link
              href="/kontakt"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
            >
              Skontaktuj się
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+48256336800"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-700"
            >
              <Phone className="h-4 w-4" />
              25 633 68 00
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
