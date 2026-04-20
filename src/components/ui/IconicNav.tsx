"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
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

  const navItems = [
    { name: "Start", path: "/", icon: Home },
    { name: "Pulpit", path: "/admin", icon: LayoutDashboard },
    { name: "Katalog", path: "/admin/products", icon: Package },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Oferty", path: "/admin/quotes", icon: FileText },
    { name: "Serwis", path: "/admin/repairs", icon: Wrench },
    { name: "System", path: "/admin/settings", icon: Settings },
  ];

  const activePath = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  return (
    <nav className="flex items-center justify-between px-8 py-3 max-w-[1920px] mx-auto w-full select-none">
      
      {/* 1. BRANDING (SATEL/DHL HYBRID) */}
      <Link href="/" className="flex items-center gap-4 mr-10 group">
         <div className="w-12 h-12 bg-primary text-white flex items-center justify-center rounded-sm active-press shadow-sm">
            <ShieldAlert className="w-7 h-7" />
         </div>
         <div className="flex flex-col leading-none">
            <span className="text-[14px] font-black tracking-tighter text-slate-950 uppercase italic">CEL-TRONICS</span>
            <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Tech_Standard</span>
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
            <div className="flex flex-col items-end leading-tight pr-1 hidden xl:flex">
               <span className="text-[11px] font-black text-slate-950 uppercase tracking-tighter">Inż. Administrator</span>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: CRT-990</span>
            </div>
            <Link href="/admin/profile" className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-pill hover:bg-slate-100 transition-all active-press">
               <UserCircle className="w-6 h-6 text-slate-950" />
               <span className="text-[10px] font-black text-slate-950 pr-1 uppercase tracking-widest hidden sm:inline">Panel</span>
            </Link>
            
            <button 
              onClick={() => signOut()}
              className="group flex items-center gap-2 ml-4 px-4 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-all active-press rounded-sm"
              title="Wyloguj z systemu"
            >
               <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
               <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Wyloguj</span>
            </button>
         </div>
      </div>

    </nav>
  )
}
