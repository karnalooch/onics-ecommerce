import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { IconicNav } from '@/components/ui/IconicNav'
import { SessionProvider } from '@/components/SessionProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'CEL-TRONICS B2B - ELITE ENGINEERING STANDARD',
  description: 'Profesjonalny system operacyjny sektora Security. Platforma B2B Celtronics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
        >
          <Toaster position="top-right" richColors />
          <SessionProvider>
            {/* STICKY HEADER (Elite Top Bar Mandate) */}
            <header className="sticky top-0 z-[100] bg-white border-b border-slate-100 shadow-sm no-print">
               <IconicNav />
            </header>

            <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 lg:px-8 py-6" suppressHydrationWarning>
              {children}
            </main>

            <footer className="bg-white border-t py-8 mt-auto no-print">
              <div className="max-w-[1920px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] text-muted-foreground uppercase tracking-widest font-black">
                <div className="flex items-center gap-8">
                  <span className="text-slate-900">P.U.H. "CEL-TRONICS" S.C.</span>
                  <span>MSWiA L-0123/26</span>
                  <span>PISA Certyfikacja</span>
                </div>
                <div className="flex items-center gap-8">
                  <span>© 2026 Technologia Inżynieryjna</span>
                  <div className="flex gap-4">
                     <a href="#" className="hover:text-primary transition-colors">Regulamin</a>
                     <a href="#" className="hover:text-primary transition-colors">RODO</a>
                  </div>
                </div>
              </div>
            </footer>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
