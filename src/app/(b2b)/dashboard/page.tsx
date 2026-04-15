import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  ShieldCheck, 
  UserCircle2, 
  Zap, 
  FileText, 
  Wrench, 
  HelpCircle, 
  ArrowUpRight,
  Bell,
  Wallet,
  Calendar
} from "lucide-react";
import { InstallerTier } from "@/components/ui/InstallerTier";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const user = session.user as any;
  const userNIP = user?.nip || "BRAK PODPIĘTEGO KSEF";
  const companyName = user?.companyName || "Twoja Firma";

  // Mock data for progression - in production this would come from the database/Strapi
  const stats = {
    points: 42500,
    nextLevelPoints: 100000,
    level: "SILVER",
    discount: 15,
    activeRMA: 1,
    pendingQuotes: 3
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-7xl animate-in fade-in duration-700">
      
      {/* Header section with dynamic greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Cześć, {companyName.split(' ')[0]}!
            <Zap className="w-8 h-8 text-amber-500 fill-amber-500" />
          </h1>
          <p className="text-slate-500 font-medium mt-1">Witamy w Twoim centrum dowodzenia B2B Celtronics Pro.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all group relative">
            <Bell className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none mb-1">KSeF Validated</span>
              <span className="text-emerald-700 font-mono font-bold text-sm leading-none">{userNIP}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Progression Card */}
        <div className="lg:col-span-2">
          <InstallerTier 
            currentLevel={stats.level}
            points={stats.points}
            nextLevelPoints={stats.nextLevelPoints}
            discount={stats.discount}
          />
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-1 gap-4">
           <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform">
                <Wallet className="w-16 h-16" />
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Obroty YTD</p>
              <h3 className="text-3xl font-black mb-4">42 500,00 PLN</h3>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-400/10 w-fit px-3 py-1 rounded-full border border-emerald-400/20">
                <ArrowUpRight className="w-4 h-4" />
                +12.4% vs L-Year
              </div>
           </div>

           <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Calendar className="w-6 h-6 text-blue-600" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Status</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-slate-900">{stats.activeRMA} Naprawa RMA</p>
                <p className="text-slate-500 text-sm font-medium mt-1">Ostatnia aktualizacja: dzis, 10:45</p>
              </div>
              <Link href="/oferty/naprawy" className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                Przejdź do serwisu
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>
        </div>
      </div>

      {/* Bento Grid Quick Actions */}
      <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
        Szybki Terminal
        <div className="h-px bg-slate-200 flex-1"></div>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickActionCard 
          icon={<FileText className="w-6 h-6" />}
          title="Katalog Ofert"
          desc="Buduj wyceny dla swoich klientów z rabatem B2B."
          href="/oferty"
          variant="blue"
        />
        <QuickActionCard 
          icon={<Zap className="w-6 h-6" />}
          title="Nowe Zapytanie"
          desc="Wyślij listę zestawienia bezpośrednio do opiekuna."
          href="/oferty"
          variant="amber"
          badge="Popularne"
        />
        <QuickActionCard 
          icon={<Wrench className="w-6 h-6" />}
          title="Zgłoś RMA"
          desc="Uproszczona procedura reklamacyjna online."
          href="/oferty/naprawy"
          variant="rose"
        />
        <QuickActionCard 
          icon={<HelpCircle className="w-6 h-6" />}
          title="Centrum Pomocy"
          desc="Dokumentacja techniczna i wsparcie projektowe."
          href="/kontakt"
          variant="slate"
        />
      </div>
    </div>
  );
}

function QuickActionCard({ icon, title, desc, href, variant, badge }: { 
  icon: React.ReactNode, 
  title: string, 
  desc: string, 
  href: string,
  variant: "blue" | "amber" | "rose" | "slate",
  badge?: string
}) {
  const variants = {
    blue: "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100/50",
    amber: "bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100/50",
    rose: "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/50",
    slate: "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/50",
  };

  return (
    <Link href={href} className={`flex flex-col p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl shadow-slate-200/50 ${variants[variant]}`}>
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-inherit w-fit mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-bold text-slate-900">{title}</h3>
        {badge && <span className="bg-slate-900 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter animate-pulse">{badge}</span>}
      </div>
      <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
      <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
        Otwórz teraz <ArrowUpRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
