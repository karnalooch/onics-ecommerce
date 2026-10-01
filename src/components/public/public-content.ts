/** Company details carried forward from the public site; no invented proof claims. */
export const companyContact = {
  phone: "25 633 68 00", telephoneHref: "tel:+48256336800",
  email: "serwis@celtronics.pl", emailHref: "mailto:serwis@celtronics.pl",
  address: "ul. Niklowa 22, 08-110 Siedlce",
} as const

export const publicNavigation = [
  { label: "Firma", href: "/" }, { label: "Usługi", href: "/uslugi" },
  { label: "Katalog", href: "/produkty" }, { label: "Kontakt", href: "/kontakt" },
] as const

export const companyServices = [
  { title: "Systemy alarmowe", code: "SSWiN", description: "Projekt, montaż i rozbudowa systemów sygnalizacji włamania i napadu." },
  { title: "Monitoring wizyjny", code: "CCTV", description: "Kamery, rejestracja, sieć i zdalny dostęp dobrane do potrzeb obiektu." },
  { title: "Kontrola dostępu", code: "KD / RCP", description: "Kontrola przejść, identyfikacja użytkowników i rejestracja czasu pracy." },
  { title: "Systemy przeciwpożarowe", code: "SSP / PPOŻ", description: "Wykrywanie pożaru, alarmowanie i rozwiązania wspierające ewakuację." },
  { title: "Instalacje teletechniczne", code: "Sieci", description: "Okablowanie i infrastruktura przygotowana do stabilnej eksploatacji." },
  { title: "Serwis i modernizacje", code: "Serwis", description: "Diagnostyka, naprawy, konserwacja i rozwój istniejących instalacji." },
] as const
