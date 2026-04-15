import Link from 'next/link';
import { Package, Wrench, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function B2BLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || (session.user as any)?.role !== 'BIZ') {
    redirect('/logowanie');
  }

  const user = session.user as any;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-white flex-col hidden md:flex sticky top-0 h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100 z-10 transition-all duration-300">
        <div className="p-6 border-b border-slate-100/80">
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 tracking-tight block">Celtronics B2B</span>
          <p className="text-xs text-slate-400 mt-1.5 font-semibold uppercase tracking-wider truncate">{user.companyName || "Panel Instalatora"}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm transition-all group">
            <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            Panel Główny
          </Link>
          <Link href="/oferty" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm transition-all group">
            <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            Katalog Oferty
          </Link>
          <Link href="/oferty/zamowienia" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm transition-all group">
            <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            Historia Zamówień
          </Link>
          <Link href="/oferty/naprawy" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 hover:shadow-sm transition-all group">
            <Wrench className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            Zgłoszenia RMA
          </Link>
          
          <div className="pt-4 pb-1">
            <p className="px-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">Konfiguracja</p>
          </div>
          
          <Link href="/ustawienia" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80 hover:shadow-sm transition-all group">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            Profil Firmy
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-rose-600 bg-rose-50/50 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 rounded-xl transition-all shadow-sm">
               <LogOut className="w-4 h-4" />
               Wyloguj się
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
