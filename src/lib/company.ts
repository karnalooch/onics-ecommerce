export const COMPANY_PUBLIC = {
  name: 'P.U.H. "CEL-TRONICS" S.C.',
  shortName: "CEL-TRONICS",
  addressLine1: "ul. Niklowa 22",
  addressLine2: "08-110 Siedlce",
  phoneDisplay: "25 633 68 00",
  phoneHref: "tel:+48256336800",
  email: "serwis@celtronics.pl",
  website: "www.celtronics.pl",
  nip: process.env.NEXT_PUBLIC_COMPANY_NIP?.trim() || null,
} as const
