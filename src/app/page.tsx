import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  Camera,
  Cable,
  CheckCircle2,
  DoorOpen,
  Flame,
  ShieldCheck,
  Wrench,
} from "lucide-react"

const services = [
  {
    title: "Systemy alarmowe",
    label: "SSWiN",
    description:
      "Projekt, montaż i rozbudowa systemów sygnalizacji włamania i napadu dla domów, firm i instytucji.",
    icon: BellRing,
  },
  {
    title: "Monitoring CCTV",
    label: "CCTV",
    description:
      "Monitoring wizyjny, rejestracja i zdalny dostęp — od małych instalacji po rozbudowane obiekty.",
    icon: Camera,
  },
  {
    title: "Kontrola dostępu",
    label: "KD / RCP",
    description:
      "Identyfikacja użytkowników, kontrola przejść i integracja z pozostałymi warstwami bezpieczeństwa.",
    icon: DoorOpen,
  },
  {
    title: "Systemy przeciwpożarowe",
    label: "SSP / PPOŻ",
    description:
      "Systemy wykrywania pożaru i rozwiązania wspierające bezpieczną reakcję oraz ewakuację.",
    icon: Flame,
  },
  {
    title: "Instalacje teletechniczne",
    label: "INFRASTRUKTURA",
    description:
      "Okablowanie, sieci strukturalne i infrastruktura techniczna przygotowana pod niezawodną eksploatację.",
    icon: Cable,
  },
  {
    title: "Serwis i modernizacje",
    label: "OPIEKA",
    description:
      "Diagnostyka, naprawy, konserwacja i dostosowanie istniejących systemów do nowych potrzeb.",
    icon: Wrench,
  },
]

const process = [
  {
    index: "01",
    title: "Analiza i projekt",
    description:
      "Poznajemy obiekt, sposób jego użytkowania, istniejącą infrastrukturę i wymagania bezpieczeństwa.",
  },
  {
    index: "02",
    title: "Montaż i uruchomienie",
    description:
      "Instalujemy, konfigurujemy i testujemy system tak, aby był czytelny, stabilny i serwisowalny.",
  },
  {
    index: "03",
    title: "Serwis i rozwój",
    description:
      "Zostajemy przy instalacji po uruchomieniu: diagnozujemy, konserwujemy i rozbudowujemy ją wraz z potrzebami obiektu.",
  },
]

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="relative px-2 pb-16 pt-8 sm:px-4 lg:pb-24 lg:pt-14">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_15%_10%,rgba(0,120,212,0.12),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(14,165,233,0.10),transparent_30%)]" />
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-4 py-2 text-xs font-extrabold tracking-wide text-primary">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Siedlce i region · ponad 30 lat doświadczenia
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-6xl lg:text-7xl">
              Technologia, która chroni ludzi, obiekty i ciągłość działania.
            </h1>

            <p className="mt-7 max-w-3xl text-lg font-medium leading-8 text-muted-foreground sm:text-xl">
              Projektujemy, wdrażamy i serwisujemy systemy zabezpieczeń elektronicznych —
              od alarmów i monitoringu CCTV po kontrolę dostępu, systemy przeciwpożarowe,
              sieci teletechniczne i instalacje elektryczne.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/kontakt"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-7 text-sm font-extrabold text-white shadow-xl shadow-primary/20 transition hover:brightness-110"
              >
                Porozmawiaj z nami
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/produkty"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-black/10 bg-white px-7 text-sm font-extrabold text-foreground transition hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/5"
              >
                Przejdź do katalogu B2B
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                <span>
                  <strong className="block text-foreground">Projekt + montaż + serwis</strong>
                  jeden zespół odpowiedzialny za całość
                </span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                <span>
                  <strong className="block text-foreground">Siedlce</strong>
                  ul. Niklowa 22, 08-110
                </span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1c2d] p-7 text-white shadow-2xl sm:p-10">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/30 blur-[90px]" />
            <div className="relative">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                Kompleksowe systemy bezpieczeństwa
              </span>
              <h2 className="mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Od projektu instalacji do wieloletniej opieki serwisowej.
              </h2>

              <div className="mt-9 grid grid-cols-2 gap-3">
                {[
                  ["SSWiN", "systemy alarmowe"],
                  ["CCTV", "monitoring wizyjny"],
                  ["KD / RCP", "kontrola dostępu"],
                  ["SSP / PPOŻ", "sygnalizacja pożaru"],
                  ["Teletechnika", "sieci i infrastruktura"],
                  ["Serwis", "konserwacja i modernizacje"],
                ].map(([name, description]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                  >
                    <strong className="block text-base">{name}</strong>
                    <span className="mt-1 block text-xs font-medium leading-5 text-slate-300">
                      {description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="uslugi" className="px-2 py-16 sm:px-4 lg:py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
                Zakres usług
              </span>
              <h2 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl">
                Bezpieczeństwo bez przypadkowych elementów.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-medium leading-7 text-muted-foreground">
              Dobieramy system do obiektu i sposobu jego użytkowania. Nie sprzedajemy
              przypadkowego zestawu urządzeń — projektujemy rozwiązanie, które ma działać jako całość.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-2xl border border-black/5 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <service.icon className="h-6 w-6" />
                </div>
                <span className="mt-7 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
                  {service.label}
                </span>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{service.title}</h3>
                <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#102033] px-2 py-16 text-white sm:px-4 lg:py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300">
                Jak pracujemy
              </span>
              <h2 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-[-0.035em] sm:text-5xl">
                Jedna odpowiedzialność od początku do końca.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-medium leading-7 text-slate-300">
              Najpierw rozumiemy ryzyko i obiekt. Dopiero potem dobieramy technologię,
              wykonujemy instalację i zostajemy przy niej serwisowo.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {process.map((step) => (
              <article key={step.index} className="rounded-2xl border border-white/10 p-7">
                <span className="text-xs font-extrabold tracking-[0.16em] text-blue-300">
                  {step.index}
                </span>
                <h3 className="mt-5 text-2xl font-extrabold">{step.title}</h3>
                <p className="mt-4 text-sm font-medium leading-6 text-slate-300">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-2 py-16 sm:px-4 lg:py-24">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 rounded-[28px] bg-primary p-8 text-white shadow-2xl shadow-primary/20 sm:p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Masz obiekt, który wymaga dobrego projektu?
            </h2>
            <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-blue-100">
              Opisz potrzeby. Wrócimy z konkretnymi pytaniami i propozycją dalszych kroków.
            </p>
          </div>
          <Link
            href="/kontakt"
            className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-extrabold text-primary"
          >
            Skontaktuj się
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
