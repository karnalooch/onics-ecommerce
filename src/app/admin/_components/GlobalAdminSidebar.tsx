"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Package, 
  ShieldCheck, 
  LayoutGrid, 
  Brain, 
  Search, 
  Database, 
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  FileText,
  Wrench,
  LogOut,
  PackageSearch
} from "lucide-react";

export function GlobalAdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Zarządzaj Zamówieniami", path: "/admin/orders", icon: FileSpreadsheet },
    { name: "Klienci", path: "/admin/clients", icon: Users },
    { name: "Katalog & Wiedza", path: "/admin/catalog", icon: PackageSearch }, // Using Package as a proxy for now
    { name: "Generator Ofert", path: "/admin/quotes", icon: FileText },
    { name: "Generator Cenników", path: "/admin/price-lists", icon: FileSpreadsheet },
    { name: "Serwis / RMA", path: "/admin/repairs", icon: Wrench },
  ];

  const isActive = (path: string) => {
    if (path === "/admin" && pathname !== "/admin") return false;
    return pathname.startsWith(path);
  };

  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-6 top-1/2 -translate-y-1/2 z-[60] hidden xl:flex flex-col gap-8"
    >
      {/* BRANDING HUB */}
      <div className="glass-card p-6 rounded-3xl flex flex-col items-center gap-2">
         <div className="relative p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-2xl shadow-ks-md">
            <Database className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse border-2 border-slate-900" />
         </div>
         <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">V12 Core</span>
      </div>

      {/* NAVIGATION PILL */}
      <div className="p-3 bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-ks-lg flex flex-col gap-4">
        
        <GlobalSidebarItem 
           href="/admin" 
           icon={<LayoutDashboard className="w-5 h-5" />} 
           label="System Dashboard" 
           active={isActive("/admin")}
        />

        <GlobalSidebarItem 
           href="/admin/catalog" 
           icon={<Package className="w-5 h-5" />} 
           label="Katalog Hub" 
           active={isActive("/admin/catalog")}
        />

        <GlobalSidebarItem 
           href="/admin/clients" 
           icon={<Users className="w-5 h-5" />} 
           label="Centrum Klienta" 
           active={isActive("/admin/clients")}
        />

        <GlobalSidebarItem 
           href="/admin/orders" 
           icon={<FileSpreadsheet className="w-5 h-5" />} 
           label="Rejestr Zamówień" 
           active={isActive("/admin/orders")}
        />

        <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800 mx-auto my-1" />

        <GlobalSidebarItem 
           href="/admin/repairs" 
           icon={<Wrench className="w-5 h-5" />} 
           label="Serwis / RMA" 
           active={isActive("/admin/repairs")}
        />

        <button 
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-all group"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          aria-label="Open Command Palette"
        >
          <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* STATUS & LOGOUT DOCK */}
      <div className="glass-card px-4 py-8 rounded-3xl flex flex-col items-center gap-6">
         <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] relative z-10" />
         </div>

         <Link 
            href="/" 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
            aria-label="Wyjdź do Sklepu"
         >
            <LogOut className="w-5 h-5" />
         </Link>
      </div>
    </motion.aside>
  );
}

function GlobalSidebarItem({ href, icon, label, active }: any) {
  return (
    <Link 
      href={href}
      className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group ${
         active 
           ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-ks-md' 
           : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
       <div className="relative z-10">
          {icon}
       </div>
       
       {/* Tooltip */}
       <div className="absolute left-20 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap shadow-ks-lg">
        {label}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-right-slate-900 h-0 w-0" />
      </div>
    </Link>
  );
}
