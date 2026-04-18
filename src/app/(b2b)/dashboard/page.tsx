import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { 
  ShieldCheck, 
  Zap, 
  FileText, 
  Wrench, 
  HelpCircle, 
  ArrowUpRight,
  Bell,
  Wallet,
  Calendar,
  ChevronRight
} from "lucide-react";
import { InstallerTier } from "@/components/ui/InstallerTier";
import Link from "next/link";
import { initializeMockData } from "@/store/serverStore";

export default async function DashboardPage() {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect("/logowanie");
  }

  const { repairs } = initializeMockData();
  const activeRMA = repairs.filter((r: any) => r.status !== 'DONE').length;

  const user = session.user as any;
  const userNIP = user?.nip || "WERYFIKACJA NIP...";
  const companyName = user?.companyName || "Twoja Firma";

  return (
    <div className="container mx-auto py-8 px-6 max-w-7xl animate-in fade-in duration-700">
      
      {/* Header section with dynamic greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
            Cześć, {companyName.split(' ')[0]}!
            <Zap className="w-8 h-8 text-primary fill-primary/20" />
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Witamy w centrum dowodzenia Celtronics Pro.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-3 bg-card border border-border rounded-2xl shadow-sm hover:bg-muted transition-all group relative">
            <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
          </button>
          <div className="bg-primary/5 border border-primary/20 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">KSeF Validated</span>
              <span className="text-foreground font-mono font-bold text-sm leading-none">{userNIP}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Progression Card */}
        <div className="lg:col-span-2">
          <InstallerTier 
            currentLevel={user.tierName || "PARTNER"}
            discount={user.discount || 0}
          />
        </div>

        {/* Secondary Info Grid */}
        <div className="grid grid-cols-1 gap-4">
           <div className="bg-primary border border-primary/20 rounded-3xl p-6 text-primary-foreground relative overflow-hidden group shadow-lg shadow-primary/20">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform group-hover:scale-110 transition-transform">
                <Wallet className="w-16 h-16" />
              </div>
              <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider mb-1">Obroty YTD</p>
              <h3 className="text-3xl font-black mb-4">42 500,00 PLN</h3>
              <div className="flex items-center gap-2 text-primary-foreground text-sm font-bold bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
                <ArrowUpRight className="w-4 h-4" />
                +12.4% vs L-Year
              </div>
           </div>

           <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Calendar className="w-6 h-6 text-primary" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Status</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black text-foreground">{activeRMA} Naprawa RMA</p>
                <p className="text-muted-foreground text-sm font-medium mt-1">Ostatnia aktualizacja: dzisiaj, 10:45</p>
              </div>
              <Link href="/oferty/naprawy" className="mt-4 text-sm font-bold text-primary hover:underline flex items-center gap-1 group">
                Przejdź do serwisu
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>
        </div>
      </div>

      {/* Bento Grid Quick Actions */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground flex items-center gap-2 uppercase tracking-tight">
          Szybki Terminal
        </h2>
        <div className="h-px bg-border flex-1 ml-6"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickActionCard 
          icon={<FileText className="w-6 h-6" />}
          title="Katalog Ofert"
          desc="Buduj wyceny dla swoich klientów z rabatem B2B."
          href="/oferty"
          variant="primary"
        />
        <QuickActionCard 
          icon={<Zap className="w-6 h-6" />}
          title="Nowe Zapytanie"
          desc="Wyślij listę zestawienia bezpośrednio do opiekuna."
          href="/oferty"
          variant="primary"
          badge="Popularne"
        />
        <QuickActionCard 
          icon={<Wrench className="w-6 h-6" />}
          title="Zgłoś RMA"
          desc="Uproszczona procedura reklamacyjna online."
          href="/oferty/naprawy"
          variant="secondary"
        />
        <QuickActionCard 
          icon={<HelpCircle className="w-6 h-6" />}
          title="Centrum Pomocy"
          desc="Dokumentacja techniczna i wsparcie projektowe."
          href="/kontakt"
          variant="secondary"
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
  variant: "primary" | "secondary",
  badge?: string
}) {
  const variants = {
    primary: "bg-primary/5 border-primary/20 hover:bg-primary/10",
    secondary: "bg-card border-border hover:bg-muted"
  };

  return (
    <Link href={href} className={`flex flex-col p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl shadow-primary/5 ${variants[variant]}`}>
      <div className="bg-background p-3 rounded-2xl shadow-sm border border-border w-fit mb-4 group-hover:scale-110 transition-transform">
        <div className="text-primary">{icon}</div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-bold text-foreground">{title}</h3>
        {badge && <span className="bg-primary text-primary-foreground text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter">{badge}</span>}
      </div>
      <p className="text-muted-foreground text-sm font-medium leading-relaxed">{desc}</p>
      <div className="mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Otwórz teraz <ArrowUpRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
