import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/SessionProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { AppChrome } from "@/components/shell/AppChrome"
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
  const bodyClasses = [
    inter.variable,
    jetbrains.variable,
    "min-h-screen bg-background font-sans text-foreground antialiased",
  ].join(" ")

  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={bodyClasses} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          forcedTheme="light"
        >
          <Toaster position="top-right" richColors />
          <SessionProvider>
            <AppChrome>{children}</AppChrome>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
