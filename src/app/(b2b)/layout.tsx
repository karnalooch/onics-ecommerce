import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Package, 
  Wrench, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default async function B2BLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect('/logowanie');
  }

  const user = session.user as any;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar - Redesigned to White/Gray/Blue Corporate style */}
      <aside className="w-72 bg-background flex-col hidden md:flex sticky top-0 h-screen shadow-xl z-20 transition-all duration-300 border-r border-border/50">
        <div className="p-6 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 group">
             <img src="/assets/logo.svg" alt="Celtronics" className="h-6 w-auto" />
             <span className="text-lg font-black tracking-tighter uppercase italic">Pro</span>
          </Link>
          <div className="flex items-center gap-2 mt-4 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest truncate">Authorized Partner</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[9px] font-black text-muted-foreground tracking-widest uppercase mb-2 mt-2">Nawigacja</p>
          
          <SidebarLink href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Panel Sterowania" />
          <SidebarLink href="/oferty" icon={<Package className="w-5 h-5" />} label="Katalog Produktów" />
          <SidebarLink href="/oferty/zamowienia" icon={<Package className="w-5 h-5" />} label="Moje Zamówienia" />
          <SidebarLink href="/oferty/naprawy" icon={<Wrench className="w-5 h-5" />} label="Serwis i RMA" />
          
          <div className="pt-8 pb-2">
            <p className="px-4 text-[9px] font-black text-muted-foreground tracking-widest uppercase">Ustawienia</p>
          </div>
          
          <SidebarLink href="/ustawienia" icon={<Settings className="w-5 h-5" />} label="Dane Firmowe" />
        </nav>

        <div className="p-4 bg-muted/20 border-t border-border/50 mt-auto">
          <div className="bg-card rounded-2xl p-5 border border-border mb-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Twoja Firma</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-foreground leading-none">{user.companyName || "Partner B2B"}</p>
              <p className="text-[10px] text-muted-foreground font-bold tracking-tight">NIP: {user.nip || "N/A"}</p>
            </div>
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-[9px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-md">Status Pro</span>
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-tight">Level A.1</span>
            </div>
          </div>

          <form 
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
             <button type="submit" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all border border-transparent hover:border-border">
               <LogOut className="w-4 h-4" />
               Wyloguj Partnera
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative min-h-screen">
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none opacity-40"></div>
        <div className="relative z-10 w-full min-h-full">
            {children}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all group">
      <div className="text-muted-foreground group-hover:text-primary transition-colors">
        {icon}
      </div>
      {label}
    </Link>
  );
}
