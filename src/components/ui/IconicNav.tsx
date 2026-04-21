"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession, signIn } from "next-auth/react"
import { 
  Home, 
  Package, 
  Users, 
  FileText, 
  Wrench, 
  Settings, 
  Search,
  Bell,
  UserCircle,
  MoreHorizontal,
  LayoutDashboard,
  ShieldAlert,
  LogOut
} from "lucide-react"

export function IconicNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const navItems = [
    { name: "Start", path: "/", icon: Home },
    { name: "Pulpit", path: "/admin", icon: LayoutDashboard },
    { name: "Katalog", path: "/admin/products", icon: Package },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Oferty", path: "/admin/quotes", icon: FileText },
    { name: "Serwis", path: "/admin/repairs", icon: Wrench },
    { name: "System", path: "/admin/categories", icon: Settings },
  ];

  const activePath = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-[100] flex items-center justify-between px-8 py-3 max-w-[1920px] mx-auto w-full select-none bg-white/95 backdrop-blur-md border-b-2 border-slate-950">
      
      {/* 1. BRANDING (FLAT & FUNCTIONAL) */}
      <Link href="/" className="flex items-center gap-4 mr-10 group active-press">
         <div className="w-12 h-12 bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white flex items-center justify-center rounded-xl transition-transform shadow-lg shadow-[#1e2335]/30">
            <ShieldAlert className="w-7 h-7" />
         </div>
         <div className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-tighter text-slate-950 uppercase italic">CEL-TRONICS</span>
            <span className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase">Engineering_Hub</span>
         </div>
      </Link>

      {/* 2. ICONIC NAVIGATION (DHL PATTERN: CIRCLES + LABELS) */}
      <div className="flex-1 flex items-center gap-1 xl:gap-4 h-full">
         {navItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-all active-press border-b-[3px] group ${
                activePath(item.path) 
                   ? 'border-primary text-slate-950 scale-105' 
                   : 'border-transparent text-slate-400 hover:text-slate-950'
              }`}
            >
               <div className={`w-11 h-11 flex items-center justify-center rounded-full border-2 transition-all group-hover:scale-110 ${
                  activePath(item.path) 
                     ? 'bg-primary/5 border-primary text-primary' 
                     : 'bg-slate-50 border-slate-100 text-slate-400'
               }`}>
                  <item.icon className="w-5 h-5" />
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest">{item.name}</span>
            </Link>
         ))}

         {/* Priority+ More Trigger */}
         <button className="flex flex-col items-center gap-1 px-4 py-2 border-b-[3px] border-transparent text-slate-400 hover:text-slate-950 group lg:hidden">
            <div className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-50 border-slate-100 border-2 group-hover:scale-110">
               <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Więcej</span>
         </button>
      </div>

      {/* 3. UTILITIES & SUPPORT (DHL STYLE) */}
      <div className="flex items-center gap-6 divide-x divide-slate-100">
         
         {/* FAST SEARCH */}
         <div className="flex items-center gap-4 px-2">
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
               <Search className="w-5 h-5" />
            </button>
            <button className="relative w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
               <Bell className="w-5 h-5" />
               <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
         </div>

         {/* USER HUB (PILL) */}
         <div className="flex items-center gap-3 pl-6">
            {isAuthenticated ? (
               <>
                  <div className="flex flex-col items-end leading-tight pr-1 hidden xl:flex">
                     <span className="text-[11px] font-black text-slate-950 uppercase tracking-tighter">
                        {session.user?.name || "Użytkownik"}
                     </span>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        ID: {(session.user as any)?.id?.substring(0, 7).toUpperCase() || "N/A"}
                     </span>
                  </div>
                  <Link href="/admin/profile" className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-pill hover:bg-slate-100 transition-all active-press">
                     <UserCircle className="w-6 h-6 text-slate-950" />
                     <span className="text-[10px] font-black text-slate-950 pr-1 uppercase tracking-widest hidden sm:inline">Panel</span>
                  </Link>
                  
                  <button 
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="group flex items-center gap-2 ml-4 px-6 py-2 bg-blue-500 hover:brightness-110 text-white transition-all active-press rounded-sm shadow-lg shadow-blue-500/40"
                    title="Wyloguj z systemu"
                  >
                     <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Wyloguj</span>
                  </button>
               </>
            ) : isLoading ? (
               <div className="flex items-center gap-4 px-3 py-1">
                  <div className="w-24 h-4 bg-slate-100 animate-pulse rounded-full" />
               </div>
            ) : (
               <>
                  <Link 
                    href="/logowanie"
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white hover:brightness-110 shadow-lg shadow-blue-500/40 transition-all active-press rounded-sm"
                  >
                     <UserCircle className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Zaloguj / B2B</span>
                  </Link>
               </>
            )}
         </div>
      </div>

    </nav>
  )
}
