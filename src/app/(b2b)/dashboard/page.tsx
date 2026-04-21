import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  Bell, ShieldCheck, Wallet, Calendar, FileText, Zap, Wrench, 
  HelpCircle, Database, Terminal, Activity, ArrowRight,
  TrendingUp, Box
} from "lucide-react";
import { InstallerTier } from "@/components/ui/InstallerTier";
import { initializeMockData } from "@/store/serverStore";
import { StatCard } from "./_components/StatCard";
import { QuickActionTerminal } from "./_components/QuickActionTerminal";

export default async function DashboardPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'BIZ') redirect("/logowanie");

  const { repairs } = initializeMockData();
  const activeRMA = repairs.filter((r: any) => r.status !== 'DONE').length;
  const user = session.user as any;

  return (
    <div className="flex flex-col gap-16 animate-in fade-in duration-700 no-blur select-none" suppressHydrationWarning>
       
       {/* ELITE DASHBOARD HEADER (Technical Overview) */}
       <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-10 border-b-2 border-slate-950 pb-12">
          <div className="flex flex-col gap-2">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic leading-none">TERMINAL_B2B_V4</span>
                <div className="h-[1px] w-8 bg-slate-200" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">Session_Active</span>
             </div>
             <h1 className="text-6xl font-black tracking-tighter text-slate-950 uppercase italic leading-none mt-2">
                STATUS: <span className="text-primary NOT-italic">{user.companyName.split(' ')[0]}</span>
             </h1>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic mt-2">Autoryzowany punkt dostępowy Celtronics Cloud.</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="bg-white border-2 border-slate-950 p-6 flex items-center gap-8 shadow-xl shadow-slate-900/5 relative group">
                <div className="bg-slate-950 text-white p-3 rounded-none">
                   <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 italic">Identity_Verified (NIP)</span>
                   <span className="text-slate-950 font-black text-2xl tabular-nums italic leading-none">{user.nip}</span>
                </div>
                <div className="absolute top-1 right-1 w-2 h-2 bg-status-success animate-ping" />
             </div>
             <button className="bg-slate-950 text-white h-full p-6 flex items-center justify-center hover:bg-primary transition-all active-press">
                <Bell className="w-6 h-6" />
             </button>
          </div>
       </header>

       {/* OPERATIONAL METRICS (High Density) */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-8">
             {/* Tier information is naturally raw, but we'll ensure it blends with the new dashboard */}
             <div className="satel-card bg-white p-10 h-full border-none shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                <InstallerTier 
                  currentLevel={user.tierName || "PARTNER"} 
                  discount={user.discount || 0} 
                />
             </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8">
             <StatCard 
               label="Obroty YTD_Registry" 
               value="42 500,00 PLN" 
               Icon={Wallet} 
               trend="+12.4%" 
             />
             <StatCard 
               label="Status_Link_Serwis" 
               value={`${activeRMA} Zgłoszenia`} 
               subValue="Naprawy w toku diagnostyki" 
               Icon={Calendar} 
             />
          </div>
       </div>

       {/* COMMAND CENTER (Action Matrix) */}
       <div className="space-y-12">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-slate-950" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">Centrum Operacyjne</h2>
             </div>
             <div className="h-[2px] bg-slate-950 flex-1 opacity-5" />
             <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase italic font-mono">Stream: Live</span>
             </div>
          </div>
          
          <QuickActionTerminal actions={[
            { title: "KATALOG_B2B", desc: "Dedykowana matryca cenowa i stany magazynowe.", href: "/sklep", Icon: FileText, badge: "PIM" },
            { title: "ZŁÓŻ_PROJEKT", desc: "Szybka ścieżka wyceny dla inwestycji systemowych.", href: "/kontakt", Icon: Zap },
            { title: "SERWIS_RMA", desc: "Portal zgłoszeń i monitoringu terminali technicznych.", href: "/oferty/naprawy", Icon: Wrench },
            { title: "SUPPORT_NODE", desc: "Baza dokumentacji i czat z inżynierem projektowym.", href: "/kontakt", Icon: HelpCircle },
          ]} />
       </div>

       {/* LOWER SYSTEM STATUS */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8 print:hidden pt-8 border-t border-slate-50">
          {[
            { label: "Uptime", val: "99.98%", icon: Activity },
            { label: "Sync_Delay", val: "42ms", icon: Database },
            { label: "Security_Level", val: "MSWiA_Grade", icon: ShieldCheck },
            { label: "Active_Nodes", val: "128", icon: Box },
          ].map((item, i) => (
             <div key={i} className="flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity">
                <item.icon className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                   <span className="text-[10px] font-black text-slate-950 uppercase italic font-mono">{item.val}</span>
                </div>
             </div>
          ))}
       </div>

    </div>
  );
}
