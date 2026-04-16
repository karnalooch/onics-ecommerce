import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, Wrench, Settings, LayoutDashboard, LogOut } from 'lucide-react';

export default async function B2BLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect('/logowanie');
  }

  const user = session.user as any;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex-col hidden md:flex sticky top-0 h-screen shadow-2xl z-20 transition-all duration-300 border-r border-white/5">
        <div className="p-6 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight block">Celtronics Pro</span>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] truncate">B2B Authorized Partner</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all group">
            <LayoutDashboard className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            Panel Sterowania
          </Link>
          <Link href="/oferty" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all group">
            <Package className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            Katalog Produktów
          </Link>
          <Link href="/oferty/zamowienia" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all group">
            <Package className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            Moje Zamówienia
          </Link>
          <Link href="/oferty/naprawy" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all group">
            <Wrench className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            Serwis i RMA
          </Link>
          
          <div className="pt-8 pb-2">
            <p className="px-4 text-[10px] font-black text-slate-500 tracking-widest uppercase opacity-50">Administracja</p>
          </div>
          
          <Link href="/ustawienia" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-all group">
            <Settings className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            Dane Firmowe
          </Link>
        </nav>

        <div className="p-4 bg-slate-950/30 border-t border-white/5 mt-auto">
          <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-4 border border-blue-500/20 mb-4 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Twój Status</p>
            <p className="text-sm font-black text-white truncate">{user.companyName || "Partner B2B"}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-slate-400 font-medium">NIP: {user.nip || "N/A"}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[9px] font-black text-blue-300 uppercase">Level A</span>
            </div>
          </div>

          <form 
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
             <button type="submit" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20">
               <LogOut className="w-4 h-4" />
               Wyloguj Partnera
             </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
        <div className="relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
        </div>
      </main>
    </div>
  );
}
