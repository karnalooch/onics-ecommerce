import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { initializeMockData } from '@/store/serverStore';
import { 
  Package, 
  Wrench, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  ShieldCheck,
  ChevronRight,
  Database,
  Activity,
  User
} from 'lucide-react';

export default async function B2BLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const sessionUser = session?.user as
    | {
        id?: string
        email?: string | null
        name?: string | null
      }
    | undefined;

  if (!sessionUser) {
    redirect('/logowanie');
  }

  const { users } = initializeMockData();
  const currentUser = users.find(
    (user: {
      id?: string
      email?: string
      companyName?: string
      username?: string
      roleType?: string
      isApproved?: boolean
      isBlocked?: boolean
      nip?: string | null
      discount?: number
      tierName?: string
    }) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        user.email?.toLowerCase() === sessionUser.email.toLowerCase())
  );

  if (!currentUser || currentUser.isBlocked || currentUser.roleType !== 'BIZ') {
    redirect('/logowanie');
  }

  if (!currentUser.isApproved) {
    redirect('/sklep');
  }

  const user = {
    name: currentUser.companyName || currentUser.username || sessionUser.name,
    nip: currentUser.nip ?? null,
    discount: Number(currentUser.discount ?? 0),
    tierName: currentUser.tierName ?? 'BASIC',
  };

  return (
    <div className="flex min-h-screen bg-white font-mono selection:bg-primary/20" suppressHydrationWarning>
      
      {/* ELITE B2B SIDEBAR (Operational Hub Style) */}
      <aside className="w-72 bg-white flex-col hidden lg:flex sticky top-0 h-screen z-20 border-r-2 border-slate-950 no-print">
        
        {/* SIDEBAR_HEADER */}
        <div className="p-8 border-b-2 border-slate-950">
          <Link href="/" className="flex items-center gap-4 group active-press">
             <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center italic font-black shadow-lg">CT</div>
             <div className="flex flex-col">
                <span className="text-sm font-black tracking-widest uppercase italic text-slate-950">CELTRONICS</span>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                   <span className="text-[9px] font-black text-primary uppercase tracking-widest italic">Partner_B2B_Active</span>
                </div>
             </div>
          </Link>
        </div>
        
        {/* NAV_OPERATIONAL */}
        <nav className="flex-1 p-6 space-y-1 overflow-y-auto custom-scrollbar select-none">
          <div className="px-4 mb-4">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">Command_Matrix</span>
                <div className="h-[1px] flex-1 bg-slate-50" />
             </div>
          </div>
          
          <SidebarLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Terminal_Główny" />
          <SidebarLink href="/oferty" icon={<Package className="w-4 h-4" />} label="Katalog_Centrum" />
          <SidebarLink href="/oferty/zamowienia" icon={<Activity className="w-4 h-4" />} label="Potok_Zamówień" />
          <SidebarLink href="/oferty/naprawy" icon={<Wrench className="w-4 h-4" />} label="Serwis_Techniczny" />
          
          <div className="pt-10 px-4 mb-4">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">System_Config</span>
                <div className="h-[1px] flex-1 bg-slate-50" />
             </div>
          </div>
          
          <SidebarLink href="/ustawienia" icon={<Settings className="w-4 h-4" />} label="Profil_Partnera" />
        </nav>

        {/* SIDEBAR_FOOTER (Identity Block) */}
        <div className="p-8 bg-slate-50 border-t-2 border-slate-950 mt-auto">
          <div className="bg-white border-2 border-slate-950 p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-1 bg-slate-950 text-white opacity-10 group-hover:opacity-100 transition-opacity">
               <ShieldCheck className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Identity_Verified</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-950 leading-none uppercase truncate italic">{user.name || "Partner B2B"}</p>
              <p className="text-[9px] text-slate-400 font-black tracking-widest mt-1">NIP: {user.nip || "N/A"}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] font-black text-white uppercase bg-slate-950 px-2 py-0.5 italic">
                {user.tierName || "BASIC"}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                RABAT: {Number(user.discount || 0).toFixed(1)}%
              </span>
            </div>
          </div>

          <form 
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-6"
          >
             <button type="submit" className="flex items-center justify-center gap-3 w-full h-11 text-[10px] font-black text-slate-400 hover:text-slate-950 hover:bg-white border-2 border-transparent hover:border-slate-950 transition-all active-press italic uppercase tracking-widest">
               <LogOut className="w-4 h-4 text-primary" />
               Wyloguj_Partnera
             </button>
          </form>
        </div>
      </aside>

      {/* MAIN_CLIENT_VIEWPORT (Transaction Environment) */}
      <main className="flex-1 relative min-h-screen flex flex-col no-blur" suppressHydrationWarning>
        {/* OPERATIONAL_WATERMARK */}
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none opacity-40"></div>
        
        {/* VIEWPORT_CONTENT */}
        <div className="relative z-10 w-full flex-1 px-8 py-10" suppressHydrationWarning>
            {children}
        </div>

        {/* VIEWPORT_FOOTER (Stability Badge) */}
        <footer className="relative z-10 p-8 border-t border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-sm print:hidden">
           <div className="flex items-center gap-4 text-slate-300">
              <Database className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-[0.25em] italic">CEL-TRONICS · STREFA PARTNERA B2B</span>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-status-success shadow-xl shadow-status-success/40" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Sesja zalogowana</span>
              </div>
           </div>
        </footer>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 hover:bg-slate-50 border-l-4 border-transparent hover:border-primary transition-all group active-press italic">
      <div className="text-slate-300 group-hover:text-primary transition-colors shrink-0">
        {icon}
      </div>
      <span className="truncate">{label}</span>
      <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-20 transition-all -translate-x-2 group-hover:translate-x-0" />
    </Link>
  );
}
