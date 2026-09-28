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
    <div className="bg-[#f6f6f3]">
      <div className="mx-auto max-w-[1320px] px-5 py-12 sm:px-7 lg:py-16">
        <header className="grid gap-6 border-b border-[#d9dbdc] pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-base font-semibold text-primary">Usługi CEL-TRONICS</p>
            <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-5xl">
              Projekt, wykonanie i utrzymanie systemów zabezpieczeń.
            </h1>
          </div>
          <p className="text-base leading-7 text-slate-600">
            Zakres prac dobieramy do obiektu i istniejącej infrastruktury.
            Realizacja nie kończy się na montażu — obsługujemy także diagnostykę,
            konserwację, naprawy i modernizacje.
          </p>
        </header>

        <section className="mt-8 border border-[#d9dbdc] bg-white">
          <div className="divide-y divide-[#e0e1e1]">
            {services.map((service) => (
              <article
                key={service.code}
                className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[180px_minmax(0,1fr)_320px] lg:items-start"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <service.icon className="h-5 w-5 text-primary" />
                    <span className="font-mono text-xs font-semibold text-slate-500">{service.code}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950">{service.title}</h2>
                </div>

                <p className="text-[15px] leading-6 text-slate-600">{service.description}</p>

                <ul className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-slate-700">
                  {service.scope.map((item) => (
                    <li key={item} className="border-l-2 border-[#d9dbdc] pl-3">{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 rounded-xl border border-[#d9dbdc] bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-base font-semibold text-primary">Konsultacja przed realizacją</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Zacznijmy od obiektu i problemu do rozwiązania.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Opisz miejsce, zakres prac i stan obecnej instalacji. Na tej podstawie
              ustalimy dalszą ścieżkę i informacje potrzebne do wyceny.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/kontakt"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[15px] font-semibold text-white hover:bg-[#a9161c]"
            >
              Skontaktuj się
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+48256336800"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d5d7d8] px-4 text-[15px] font-semibold text-slate-800"
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
