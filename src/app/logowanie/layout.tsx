import type { Metadata } from "next"
import type { ReactNode } from "react"
export const metadata: Metadata = { title: "Logowanie do strefy partnera", robots: { index: false, follow: true }, alternates: { canonical: "/logowanie" } }
export default function LoginLayout({ children }: { children: ReactNode }) { return children }
