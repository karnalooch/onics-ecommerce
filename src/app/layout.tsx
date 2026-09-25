import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { IconicNav } from "@/components/ui/IconicNav"
import { SessionProvider } from "@/components/SessionProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  metadataBase: new URL("https://celtronics.pl"),
  title: {
    default: "CEL-TRONICS Siedlce | Systemy zabezpieczeń, monitoring, alarmy",
    template: "%s | CEL-TRONICS",
  },
  description:
    "CEL-TRONICS Siedlce: projektowanie, montaż i serwis systemów alarmowych, monitoringu CCTV, kontroli dostępu, systemów przeciwpożarowych oraz instalacji teletechnicznych i elektrycznych.",
  keywords: [
    "Cel-Tronics Siedlce",
    "systemy alarmowe Siedlce",
    "monitoring CCTV Siedlce",
    "kontrola dostępu",
    "systemy przeciwpożarowe",
    "instalacje teletechniczne",
    "serwis systemów zabezpieczeń",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "CEL-TRONICS",
    title: "CEL-TRONICS Siedlce | Systemy zabezpieczeń",
    description:
      "Projektowanie, montaż i serwis systemów bezpieczeństwa elektronicznego dla firm, instytucji i klientów indywidualnych.",
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-right" richColors />
          <SessionProvider>
            <div className="flex min-h-screen flex-col">
              <IconicNav />

              <main className="w-full flex-1">{children}</main>

              <footer className="border-t border-black/5 bg-white py-10 dark:border-white/10 dark:bg-white/[0.02]">
                <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-8 px-6 md:flex-row md:items-end">
                  <div>
                    <div className="text-sm font-extrabold text-foreground">P.U.H. CEL-TRONICS S.C.</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      ul. Niklowa 22, 08-110 Siedlce<br />
                      tel. 25 633 68 00 · serwis@celtronics.pl
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <a href="/produkty" className="hover:text-primary">Katalog B2B</a>
                    <a href="/kontakt" className="hover:text-primary">Kontakt</a>
                    <a href="/logowanie" className="hover:text-primary">Logowanie</a>
                    <span>© 2026 CEL-TRONICS</span>
                  </div>
                </div>
              </footer>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
