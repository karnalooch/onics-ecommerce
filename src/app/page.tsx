import Link from "next/link"
import { 
  ShieldCheck, 
  ChevronRight, 
  Zap, 
  Target, 
  Cpu, 
  Bell, 
  Activity, 
  ShieldAlert, 
  ArrowRight,
  Database,
  Lock,
  Globe,
  Settings,
  LogOut
} from "lucide-react"
import { auth } from "@/auth"

export default async function Home() {
  const session = await auth();
  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in duration-500 overflow-hidden pb-20">
      
      {/* 1. FLUENT HERO SECTION (MICA CARD FOCUS) */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden pt-10">
         {/* Background Orbs (Fluent Style) */}
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse delay-700" />

         <div className="container mx-auto px-6 relative z-10">
            <div className="glass-mica p-12 lg:p-20 rounded-xl border-white/20 shadow-2xl max-w-5xl mx-auto text-center backdrop-blur-3xl">
               <div className="flex items-center justify-center gap-3 mb-8">
                  <span className="px-4 py-1 bg-primary text-white text-[11px] font-bold rounded-pill uppercase tracking-widest">
                     Next-Gen B2B Platform
                  </span>
               </div>
               
               <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight text-foreground mb-8">
                  Bezpieczeństwo w wydaniu <br />
                  <span className="text-primary">Premium</span>
               </h1>
               
               <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
                  Profesjonalna dystrybucja systemów Satel i Hikvision. <br />
                  <span className="text-foreground font-semibold italic">Moc platformy stacjonarnej w oknie Twojej przeglądarki.</span>
               </p>
               
               <div className="flex flex-wrap items-center justify-center gap-6">
                  {session ? (
                     <Link href="/admin" className="h-14 px-12 bg-primary text-white flex items-center justify-center font-bold text-[14px] rounded-lg transition-all active-press hover:brightness-110 shadow-xl shadow-primary/30">
                        Przejdź do Pulpitu
                     </Link>
                  ) : (
                     <Link href="/logowanie" className="h-14 px-12 bg-primary text-white flex items-center justify-center font-bold text-[14px] rounded-lg transition-all active-press hover:brightness-110 shadow-xl shadow-primary/30">
                        Zaloguj do Panelu
                     </Link>
                  )}
                  
                  <Link href="/oferta" className="h-14 px-10 border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center font-bold text-[14px] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all active-press">
                     Eksploruj Ofertę
                  </Link>
               </div>
            </div>
         </div>
      </section>

      {/* 2. FLUENT CAPABILITY GRID (4 QUADRANTS) */}
      <section className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         {[
            { 
               title: "Systemy Alarmowe", 
               sector: "Satel SSWiN", 
               desc: "Pełna gama central INTEGRA i urządzeń ABAX 2. Bezkompromisowa ochrona.",
               icon: <ShieldAlert className="w-6 h-6 text-primary" />
            },
            { 
               title: "Monitoring Wizyjny", 
               sector: "Hikvision CCTV", 
               desc: "Kamery AcuSense, ColorVu i systemy termowizyjne. Obraz najwyższej próby.",
               icon: <Target className="w-6 h-6 text-primary" />
            },
            { 
               title: "Kontrola Dostępu", 
               sector: "KD & RCP", 
               desc: "Terminale biometryczne i zarządzanie personelem. Precyzyjna autoryzacja.",
               icon: <Database className="w-6 h-6 text-primary" />
            },
            { 
               title: "Ochrona PPOŻ", 
               sector: "Fire Safety", 
               desc: "Zautomatyzowane systemy oddymiania i wykrywania ognia. Ochrona życia.",
               icon: <Zap className="w-6 h-6 text-primary" />
            }
         ].map((card, i) => (
            <div key={i} className="fluent-card p-10 flex flex-col gap-6 group cursor-pointer border-white/10">
               <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {card.icon}
               </div>
               <div className="space-y-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{card.sector}</span>
                  <h3 className="text-2xl font-bold text-foreground leading-tight tracking-tight">{card.title}</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">{card.desc}</p>
               </div>
               <button className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest hover:gap-4 transition-all mt-4">
                  Szczegóły <ChevronRight className="w-4 h-4" />
               </button>
            </div>
         ))}
      </section>

      {/* 3. TECHNICAL DISPATCH (LATEST UPDATES) */}
      <section className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
         <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
               <Activity className="w-6 h-6 text-primary" /> Aktualności Techniczne
            </h2>
            
            <div className="space-y-4">
               {[1, 2, 3].map(i => (
                  <div key={i} className="fluent-card p-6 flex gap-8 items-start group hover:bg-black/5 dark:hover:bg-white/5 active-press">
                     <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-white dark:bg-white/5 rounded-lg shadow-sm border border-black/5 dark:border-white/10 font-bold">
                        <span className="text-[10px] opacity-50 uppercase">APR</span>
                        <span className="text-2xl">20</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest rounded-md">Update</span>
                           <span className="text-[9px] text-muted-foreground font-bold uppercase">Standard: CRT-X</span>
                        </div>
                        <h4 className="text-xl font-bold text-foreground tracking-tight transition-colors group-hover:text-primary">Nowy Standard Certyfikacji SSWiN – Wytyczne 2026</h4>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">Zaktualizowane arkusze techniczne dla central serii mSR są już dostępne w Twoim panelu B2B.</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* 4. SIDEBAR TOOLS (B2B CTA) */}
         <div className="space-y-8">
            <div className="glass-mica p-10 border-blue-500/20 bg-gradient-to-br from-primary to-blue-600 text-white rounded-xl shadow-xl relative overflow-hidden active-press">
               <Globe className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
               <h3 className="text-xl font-bold mb-4">Integracja B2B</h3>
               <p className="text-white/80 text-sm leading-relaxed mb-8 font-medium">
                  Zautomatyzuj procesy handlowe i uzyskaj wsparcie inżynieryjne Celtronics.
               </p>
               <div className="space-y-4 mb-10 text-sm font-bold">
                  {["Dynamiczne Macierze Cenowe", "Konfigurator Systemów", "Globalny Serwis RMA"].map(t => (
                     <div key={t} className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        <span>{t}</span>
                     </div>
                  ))}
               </div>
               <Link href="/rejestracja" className="w-full h-12 bg-white text-primary rounded-lg flex items-center justify-center font-bold text-xs uppercase tracking-widest shadow-lg">
                  Rozpocznij Integrację
               </Link>
            </div>

            <div className="fluent-card p-10 group">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                     <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Dostęp Ekspercki</h3>
               </div>
               <p className="text-sm text-muted-foreground font-medium mb-6">Uzyskaj dostęp do dokumentacji CAD i certyfikatów bezpieczeństwa.</p>
               <Link href="/logowanie" className="text-sm font-bold text-primary flex items-center gap-2 group-hover:gap-4 transition-all">
                  Logowanie Systemowe <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
         </div>
      </section>

    </div>
  )
}
