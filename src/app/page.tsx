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
  Settings
} from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col gap-1 w-full animate-in fade-in duration-500 overflow-hidden">
      
      {/* 1. ELITE HERO SECTION (STATIC / HIGH CONTRAST) */}
      <section className="satel-card p-0 border-none rounded-none bg-slate-900 text-white min-h-[500px] flex items-center relative">
         
         {/* Subtle Technical Pattern (No Blur) */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
         }} />

         <div className="container mx-auto px-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            
            <div className="space-y-8 py-20">
               <div className="flex items-center gap-4">
                  <span className="w-12 h-[3px] bg-primary" />
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Mission_Critical_B2B</span>
               </div>
               
               <h1 className="text-5xl lg:text-7xl font-black leading-[0.9] tracking-tighter uppercase italic">
                  EFEKTYWNOŚĆ <br />
                  <span className="text-slate-500 NOT-italic">BEZ KOMPROMISÓW</span>
               </h1>
               
               <p className="text-slate-400 text-lg max-w-xl leading-relaxed font-bold">
                  Autoryzowana dystrybucja systemów Satel i Hikvision. <br />
                  <span className="text-white">Ekstremalna użyteczność. Precyzja inżynieryjna. Wsparcie eksperckie.</span>
               </p>
               
               <div className="flex flex-wrap gap-4 pt-6">
                  <Link href="/logowanie" className="h-14 px-12 bg-primary text-white flex items-center justify-center font-black uppercase text-[12px] tracking-[0.2em] transition-all active-press active-inset hover:brightness-110 shadow-lg shadow-primary/20">
                     Zaloguj do Panelu
                  </Link>
                  <Link href="/oferta" className="h-14 px-10 border border-slate-700 text-white flex items-center justify-center font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all active-press">
                     Przeglądaj Ofertę
                  </Link>
               </div>
            </div>

            {/* Industrial Data Box (Visualizing the Standard) */}
            <div className="hidden lg:flex justify-end pr-10">
               <div className="satel-card p-10 bg-slate-800 border-slate-700 min-w-[400px] shadow-2xl relative">
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary flex items-center justify-center text-white font-black italic">V4</div>
                  <div className="space-y-6">
                     <div className="flex justify-between border-b border-slate-700 pb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">System_Status</span>
                        <span className="text-[10px] font-black text-primary uppercase">Elite_Operational</span>
                     </div>
                     <div className="space-y-3">
                        <div className="h-2 w-full bg-slate-900 overflow-hidden"><div className="h-full bg-primary w-[85%]" /></div>
                        <div className="h-2 w-full bg-slate-900 overflow-hidden"><div className="h-full bg-slate-600 w-[60%]" /></div>
                        <div className="h-2 w-full bg-slate-900 overflow-hidden"><div className="h-full bg-primary/40 w-[40%]" /></div>
                     </div>
                     <div className="pt-4 grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                           <span className="text-[9px] text-slate-500 font-black uppercase">Nodes_Active</span>
                           <span className="text-2xl font-black text-white">15,402</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[9px] text-slate-500 font-black uppercase">Service_Uptime</span>
                           <span className="text-2xl font-black text-white">100%</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* 2. SOCIAL PROOF PAS (BRANDS & CERTIFICATES) */}
      <section className="bg-background py-10 border-b border-slate-200">
         <div className="container mx-auto px-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col border-l-4 border-slate-950 pl-6 shrink-0">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engineering Partners</span>
               <span className="text-xl font-bold text-slate-950 italic">Strategic Distribution</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-16 lg:gap-24 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
               <span className="text-2xl font-black text-slate-900">SATEL</span>
               <span className="text-2xl font-black text-slate-900 italic">HIKVISION</span>
               <span className="text-2xl font-black text-slate-900 uppercase">Dahua</span>
               <span className="text-2xl font-black text-slate-900">SIEMENS</span>
               <span className="text-xl font-mono font-black text-slate-700">VANDERBILT</span>
            </div>
         </div>
      </section>

      {/* 3. TECHNICAL OFFER HUBS (FLAT QUADRANTS) */}
      <section className="container mx-auto px-4 lg:px-10 py-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
         
         {/* SSWiN Category */}
         <div className="satel-card p-10 flex flex-col gap-8 hover:border-primary active-press group">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 text-slate-950 group-hover:bg-primary group-hover:text-white transition-all">
               <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sector_SSWiN</h3>
               <h4 className="text-2xl font-black text-slate-950 leading-tight">Systemy Sygnalizacji Włamania</h4>
               <p className="text-xs text-slate-500 font-bold leading-relaxed">Centrale INTEGRA, PERFECTA, urządzenia bezprzewodowe ABAX 2. Bezkompromisowe bezpieczeństwo.</p>
            </div>
            <Link href="/oferta/sswin" className="pill-action bg-slate-950 text-white w-fit group-hover:bg-primary group-hover:shadow-lg transition-all flex items-center gap-2">
               Eksploruj <ChevronRight className="w-3 h-3" />
            </Link>
         </div>

         {/* CCTV Category */}
         <div className="satel-card p-10 flex flex-col gap-8 hover:border-primary active-press group">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 text-slate-950 group-hover:bg-primary group-hover:text-white transition-all">
               <Target className="w-7 h-7" />
            </div>
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sector_CCTV</h3>
               <h4 className="text-2xl font-black text-slate-950 leading-tight">Monitoring IP & Analityka VCA</h4>
               <p className="text-xs text-slate-500 font-bold leading-relaxed">Technologia AcuSense, ColorVu i systemy termowizyjne Hikvision. Najwyższa jakość obrazowania.</p>
            </div>
            <Link href="/oferta/cctv" className="pill-action bg-slate-950 text-white w-fit group-hover:bg-primary group-hover:shadow-lg transition-all flex items-center gap-2">
               Eksploruj <ChevronRight className="w-3 h-3" />
            </Link>
         </div>

         {/* KD Category */}
         <div className="satel-card p-10 flex flex-col gap-8 hover:border-primary active-press group">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 text-slate-950 group-hover:bg-primary group-hover:text-white transition-all">
               <Database className="w-7 h-7" />
            </div>
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sector_ACC</h3>
               <h4 className="text-2xl font-black text-slate-950 leading-tight">Kontrola Dostępu & RCP</h4>
               <p className="text-xs text-slate-500 font-bold leading-relaxed">Terminale biometryczne, zarządzanie personelem, systemy hotelowe. Precyzyjna kontrola uprawnień.</p>
            </div>
            <Link href="/oferta/kd" className="pill-action bg-slate-950 text-white w-fit group-hover:bg-primary group-hover:shadow-lg transition-all flex items-center gap-2">
               Eksploruj <ChevronRight className="w-3 h-3" />
            </Link>
         </div>

         {/* PPOZ Category */}
         <div className="satel-card p-10 flex flex-col gap-8 hover:border-primary active-press group">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-none border border-slate-100 text-slate-950 group-hover:bg-primary group-hover:text-white transition-all">
               <Zap className="w-7 h-7" />
            </div>
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sector_FIRE</h3>
               <h4 className="text-2xl font-black text-slate-950 leading-tight">Automatyka PPOŻ & Oddymianie</h4>
               <p className="text-xs text-slate-500 font-bold leading-relaxed">Systemy oddymiania Satel mSR-1, klapy dymowe i integracje pożarowe. Ochrona życia i mienia.</p>
            </div>
            <Link href="/oferta/ppoz" className="pill-action bg-slate-950 text-white w-fit group-hover:bg-primary group-hover:shadow-lg transition-all flex items-center gap-2">
               Eksploruj <ChevronRight className="w-3 h-3" />
            </Link>
         </div>

      </section>

      {/* 4. DISPATCH NEWS (LATEST UPDATES) */}
      <section className="container mx-auto px-4 lg:px-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
         
         <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
               <h2 className="text-lg font-black uppercase tracking-[0.3em] flex items-center gap-3">
                  <Activity className="w-6 h-6 text-primary" /> Technical_Dispatch
               </h2>
               <button className="text-[11px] font-black text-primary uppercase tracking-widest border-b border-primary">Wszystkie Nowości →</button>
            </div>
            
            <div className="space-y-4">
               {[1, 2, 3].map(i => (
                  <div key={i} className="satel-card p-6 flex gap-8 items-start group hover:bg-slate-50 transition-all active:scale-[0.995]">
                     <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-white border border-slate-100 shadow-sm font-black">
                        <span className="text-[10px] opacity-30 leading-none">APR</span>
                        <span className="text-2xl leading-none">20</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest">Katalog_Update</span>
                           <span className="text-[9px] text-slate-400 font-black uppercase">Standard: CRT-X</span>
                        </div>
                        <h4 className="text-xl font-black text-slate-950 tracking-tighter italic transition-colors group-hover:text-primary">Nowy Standard Certyfikacji SSWiN – Wytyczne Satel 2026</h4>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-2xl">Zaktualizowane arkusze techniczne dla central serii mSR są już dostępne do pobrania w Twoim panelu B2B.</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* 5. SIDEBAR TOOLS (B2B CTA) */}
         <div className="space-y-8">
            <div className="satel-card p-8 bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Globe className="w-32 h-32" />
               </div>
               <h3 className="text-sm font-black uppercase tracking-[0.5em] border-l-4 border-primary pl-6 mb-8 italic">B2B Core_Initializer</h3>
               <p className="text-xs text-slate-400 font-bold leading-relaxed mb-8">
                  Zautomatyzuj procesy handlowe. Zostań autoryzowanym partnerem inżynieryjnym Celtronics B2B.
               </p>
               <div className="space-y-6 mb-10">
                  {[
                     { t: "Dynamic Pricing Matrix", i: <Zap className="w-4 h-4" /> },
                     { t: "Configurator (White-Label)", i: <Cpu className="w-4 h-4" /> },
                     { t: "RMA Global Dispatch", i: <Settings className="w-4 h-4" /> }
                  ].map(item => (
                     <div key={item.t} className="flex items-center gap-4 group/li cursor-pointer">
                        <div className="w-8 h-8 bg-slate-900 border border-slate-800 flex items-center justify-center text-primary group-hover/li:bg-primary group-hover/li:text-white transition-all">
                           {item.i}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 group-hover/li:text-white transition-colors">{item.t}</span>
                     </div>
                  ))}
               </div>
               <Link href="/rejestracja" className="w-full h-14 bg-white text-slate-950 flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] active-press shadow-xl">
                  Rozpocznij Integrację
               </Link>
            </div>

            <div className="satel-card p-8 group">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-primary group-hover:text-white transition-all">
                     <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 italic">Engineering Access</h3>
               </div>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mb-4">Uzyskaj dostęp do dokumentacji CAD i certyfikatów.</p>
               <Link href="/logowanie" className="text-[11px] font-black text-slate-950 uppercase border-b-2 border-slate-950 pb-1 flex items-center gap-2 group-hover:gap-4 transition-all">
                  Logowanie Systemowe <ArrowRight className="w-4 h-4" />
               </Link>
            </div>
         </div>

      </section>

    </div>
  )
}
