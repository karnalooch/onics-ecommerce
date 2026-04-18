// src/app/(b2b)/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Bell, ShieldCheck, Wallet, Calendar, FileText, Zap, Wrench, HelpCircle } from "lucide-react";
import { InstallerTier } from "@/components/ui/InstallerTier";
import { initializeMockData } from "@/store/serverStore";
import { StatCard } from "./_components/StatCard";
import { QuickActionTerminal } from "./_components/QuickActionTerminal";

/**
 * Modern Installer B2B Dashboard (Server Component)
 * Premium unified aesthetic + RSC Performance.
 * Aligned with AI Toolkit Standards.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'BIZ') redirect("/logowanie");

  const { repairs } = initializeMockData();
  const activeRMA = repairs.filter((r: any) => r.status !== 'DONE').length;
  const user = session.user as any;

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl animate-in fade-in duration-1000">
       {/* Global Dashboard Header */}
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
          <div className="space-y-2">
             <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase italic">
                Cześć, <span className="text-primary">{user.companyName.split(' ')[0]}</span>
             </h1>
             <p className="text-slate-500 font-medium">Zalogowano do Terminala Autoryzowanego Partnera Celtronics.</p>
          </div>

          <div className="flex items-center gap-6">
             <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-2xl shadow-slate-200/50">
                <div className="bg-primary/10 p-4 rounded-2xl">
                   <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <div>
                   <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">NIP Zweryfikowany</span>
                   <span className="text-slate-900 font-mono font-black text-xl">{user.nip}</span>
                </div>
             </div>
             <button className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-xl hover:scale-110 transition-all relative">
                <Bell className="w-6 h-6 text-slate-400" />
                <span className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full border-4 border-white" />
             </button>
          </div>
       </header>

       {/* High-Level Overview Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 items-stretch">
          <div className="lg:col-span-8">
             <InstallerTier 
               currentLevel={user.tierName || "PARTNER"} 
               discount={user.discount || 0} 
             />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-10">
             <StatCard 
               label="Obroty YTD" 
               value="42 500,00 PLN" 
               Icon={Wallet} 
               variant="primary" 
               trend="+12.4%" 
             />
             <StatCard 
               label="Status Serwisu" 
               value={`${activeRMA} Zgłoszenia`} 
               subValue="Twoje aktywne naprawy w toku" 
               Icon={Calendar} 
             />
          </div>
       </div>

       {/* Quick Action Navigation Terminal */}
       <div className="space-y-10">
          <div className="flex items-center gap-6">
             <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-400">Centrum <span className="text-slate-900 italic">Dowodzenia</span></h2>
             <div className="h-px bg-slate-100 flex-1" />
          </div>
          
          <QuickActionTerminal actions={[
            { title: "Katalog B2B", desc: "Przeglądaj ofertę z Twoimi indywidualnymi rabatami.", href: "/sklep", Icon: FileText, variant: "primary", badge: "Live" },
            { title: "Zapytaj o Projekt", desc: "Wyślij specyfikację większej inwestycji do opiekuna.", href: "/kontakt", Icon: Zap, variant: "primary" },
            { title: "Serwis RMA", desc: "Zgłoś nową naprawę lub sprawdź status urządzenia.", href: "/oferty/naprawy", Icon: Wrench, variant: "white" },
            { title: "Pomoc Tech", desc: "Baza dokumentacji i wsparcie inżyniera projektowego.", href: "/kontakt", Icon: HelpCircle, variant: "white" },
          ]} />
       </div>
    </div>
  );
}
