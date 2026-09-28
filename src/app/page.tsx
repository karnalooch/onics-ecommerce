import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  Camera,
  Cable,
  DoorOpen,
  Flame,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Wrench,
} from "lucide-react"

const services = [
  {
    title: "Systemy alarmowe",
    code: "SSWiN",
    description:
      "Projekt, montaż, uruchomienie i rozbudowa systemów sygnalizacji włamania i napadu.",
    icon: BellRing,
  },
  {
    title: "Monitoring wizyjny",
    code: "CCTV",
    description:
      "Kamery, rejestracja, sieć i zdalny dostęp projektowane jako jeden system.",
    icon: Camera,
  },
  {
    title: "Kontrola dostępu",
    code: "KD / RCP",
    description:
      "Kontrola przejść, identyfikacja użytkowników i rejestracja czasu pracy.",
    icon: DoorOpen,
  },
  {
    title: "Systemy przeciwpożarowe",
    code: "SSP / PPOŻ",
    description:
      "Systemy wykrywania pożaru, alarmowania i rozwiązania wspierające bezpieczną ewakuację.",
    icon: Flame,
  },
  {
    title: "Instalacje teletechniczne",
    code: "INFRASTRUKTURA",
    description:
      "Okablowanie, sieci i infrastruktura techniczna przygotowana pod stabilną eksploatację.",
    icon: Cable,
  },
  {
    title: "Serwis i modernizacje",
    code: "SERWIS",
    description:
      "Diagnostyka, naprawy, konserwacja i rozbudowa istniejących instalacji.",
    icon: Wrench,
  },
]

const process = [
  ["01", "Rozpoznanie", "Ustalamy potrzeby obiektu, istniejącą infrastrukturę i zakres odpowiedzialności."],
  ["02", "Projekt i wykonanie", "Dobieramy rozwiązanie, montujemy urządzenia, konfigurujemy i uruchamiamy system."],
  ["03", "Serwis", "Diagnozujemy, konserwujemy i rozwijamy instalację po uruchomieniu."],
]

export default function Home() {
  return (
    <div className="bg-[#f6f6f3]">
      <section className="border-b border-[#dedfdf] bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-7 sm:py-18 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-16 lg:py-20">
          <div>
            <p className="text-base font-semibold text-primary">CEL-TRONICS · Siedlce</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-[56px]">
              Systemy zabezpieczeń. Projekt, montaż i serwis.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Realizujemy systemy alarmowe, monitoring CCTV, kontrolę dostępu,
              systemy przeciwpożarowe i instalacje teletechniczne. Obsługujemy
              nowe realizacje, modernizacje oraz istniejące instalacje wymagające serwisu.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kontakt"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-white transition hover:bg-[#a9161c]"
              >
                Omów instalację
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/uslugi"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d6d8d9] bg-white px-5 text-base font-semibold text-slate-800 transition hover:border-slate-400"
              >
                Zobacz zakres usług
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-[#d9dbdc] bg-[#fafaf8] p-6">
            <h2 className="text-lg font-semibold text-slate-950">Kontakt techniczny</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Najszybsza ścieżka do wyceny, serwisu albo konsultacji przed realizacją.
            </p>
            <div className="mt-6 space-y-4 text-[15px]">
              <a href="tel:+48256336800" className="flex items-start gap-3 text-slate-800 hover:text-primary">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span><strong className="block font-semibold">25 633 68 00</strong>telefon do CEL-TRONICS</span>
              </a>
              <a href="mailto:serwis@celtronics.pl" className="flex items-start gap-3 text-slate-800 hover:text-primary">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span><strong className="block font-semibold">serwis@celtronics.pl</strong>zapytania i serwis</span>
              </a>
              <div className="flex items-start gap-3 text-slate-700">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>ul. Niklowa 22<br />08-110 Siedlce</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-14 sm:px-7 lg:py-18">
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="text-base font-semibold text-primary">Zakres prac</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
              Jedna firma dla instalacji i późniejszego serwisu.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Dobór urządzeń jest częścią rozwiązania. Punktem wyjścia pozostaje obiekt,
              wymagania i możliwość późniejszego utrzymania systemu.
            </p>
          </div>

          <div className="grid border-t border-l border-[#dcdddd] sm:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.code}
                className="min-h-52 border-r border-b border-[#dcdddd] bg-white p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <service.icon className="h-5 w-5 text-primary" />
                  <span className="font-mono text-xs font-semibold text-slate-500">{service.code}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold text-slate-950">{service.title}</h3>
                <p className="mt-3 text-[15px] leading-6 text-slate-600">{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dedfdf] bg-white">
        <div className="mx-auto max-w-[1320px] px-5 py-14 sm:px-7 lg:py-18">
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="text-base font-semibold text-primary">Jak pracujemy</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-slate-950">
                Od rozpoznania do utrzymania instalacji.
              </h2>
            </div>
            <ol className="divide-y divide-[#dedfdf] border-y border-[#dedfdf]">
              {process.map(([index, title, description]) => (
                <li key={index} className="grid gap-3 py-5 sm:grid-cols-[56px_180px_minmax(0,1fr)] sm:items-start">
                  <span className="font-mono text-sm font-semibold text-primary">{index}</span>
                  <strong className="text-base font-semibold text-slate-950">{title}</strong>
                  <span className="text-[15px] leading-6 text-slate-600">{description}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-14 sm:px-7 lg:py-18">
        <div className="grid gap-6 rounded-xl border border-[#d9dbdc] bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <ShoppingBag className="h-5 w-5" />
              <span className="text-base font-semibold">Dla partnerów i instalatorów</span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Katalog urządzeń, ceny konta, zamówienia i serwis.
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
              Strefa partnera korzysta z tych samych danych katalogowych i warunków handlowych,
              które są weryfikowane po zalogowaniu.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/produkty" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d6d8d9] px-4 text-[15px] font-semibold text-slate-800">
              Przejdź do katalogu
            </Link>
            <Link href="/logowanie" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-[15px] font-semibold text-white">
              Strefa partnera
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
