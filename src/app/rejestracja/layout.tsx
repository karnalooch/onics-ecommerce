import type { Metadata } from "next"
import type { ReactNode } from "react"
export const metadata: Metadata = { title: "Zgłoszenie konta firmowego", robots: { index: false, follow: true }, alternates: { canonical: "/rejestracja" } }
export default function RegistrationLayout({ children }: { children: ReactNode }) { return children }
