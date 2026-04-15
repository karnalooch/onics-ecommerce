import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/ui/navbar'
import { SessionProvider } from '@/components/SessionProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { HydrationZapper } from '@/components/HydrationZapper'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'CEL-TRONICS - E-commerce B2B',
  description: 'Profesjonalne systemy alarmowe (SWN), CCTV. Platforma zakupowa B2B / B2C.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground flex flex-col" suppressHydrationWarning>
        <HydrationZapper />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t py-12 bg-muted/20">
              <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-start gap-8 text-sm text-muted-foreground">
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-foreground text-base">Celtronics S.C.</span>
                  <p>ul. Niklowa 22<br/>08-110 Siedlce<br/>Salon: ul. Kilińskiego 39D</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-foreground text-base">Kontakt Serwis / B2B</span>
                  <p>📞 +48 123 456 789<br/>📧 biuro@celtronics.pl</p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <p className="mb-2">&copy; 2026 CEL-TRONICS. Gwarancja integracji KSeF.</p>
                  <a href="/polityka-prywatnosci" className="hover:text-primary transition-colors">Dział Prawny / Regulamin</a>
                  <a href="/rejestracja" className="hover:text-primary transition-colors">Rejestracja dla Instalatorów</a>
                </div>
              </div>
            </footer>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
