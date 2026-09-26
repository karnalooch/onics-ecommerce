"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  Package, 
  Users,
  FileSpreadsheet,
  FileText,
  Wrench,
  LogOut,
  LayoutDashboard,
  Search,
  Database,
  Menu,
  Tag,
  X,
  ChevronDown,
  MoreHorizontal,
  Activity,
  CreditCard
} from "lucide-react";

export function GlobalAdminSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMoreOpen(false);
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard, priority: 10 },
    { name: "Katalog", path: "/admin/catalog", icon: Package, priority: 9 },
    { name: "Klienci", path: "/admin/clients", icon: Users, priority: 8 },
    { name: "Cenniki", path: "/admin/price-lists", icon: Tag, priority: 7 },
    { name: "Zamówienia", path: "/admin/orders", icon: FileSpreadsheet, priority: 6 },
    { name: "Ofertowania", path: "/admin/quotes", icon: FileText, priority: 5 },
    { name: "RMA/Serwis", path: "/admin/repairs", icon: Wrench, priority: 4 },
    { name: "Płatności", path: "/admin/payments", icon: CreditCard, priority: 3 },
  ];

  const primaryItems = navItems.filter(item => item.priority >= 7);
  const secondaryItems = navItems.filter(item => item.priority < 7);

  const isActive = (path: string) => {
    if (path === "/admin" && pathname !== "/admin") return false;
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* COMMAND TOP BAR (FLAT & FUNCTIONAL) */}
      <nav className="fixed top-0 left-0 right-0 z-[100] h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shadow-sm select-none font-mono">
        <div className="flex items-center h-full">
          
          {/* BRANDING (FLAT) */}
          <Link href="/" className="flex items-center gap-4 pr-10 border-r border-slate-100 h-full hover:bg-slate-50 transition-all group active-press">
            <div className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center rounded-none shrink-0 shadow-sm transition-transform">
               <Database className="w-4 h-4" />
            </div>
            <div className="flex flex-col leading-none">
               <span className="text-[11px] font-black uppercase tracking-[0.3em] italic text-slate-950">
                  CELTRONICS <span className="text-slate-400 NOT-italic">_V4</span>
               </span>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-ping" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logic_Link_Ok</span>
               </div>
            </div>
          </Link>

          {/* DESKTOP NAV (FLOATING GLASS) */}
          <div className="hidden lg:flex items-center h-full">
            {primaryItems.map((item) => (
              <Link 
                key={item.path}
                href={item.path}
                className={`h-full px-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-snap ease-snap border-b-4 active-press ${
                  isActive(item.path) 
                    ? 'border-primary text-slate-950 bg-slate-50' 
                    : 'border-transparent text-slate-400 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}

            <div className="relative h-full flex xl:hidden group">
               <button 
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`h-full px-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${isMoreOpen ? 'text-slate-950 bg-white' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'}`}
               >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>Tools</span>
               </button>

               {isMoreOpen && (
                  <div className="absolute top-[105%] left-0 w-64 bg-white border border-slate-100 shadow-md py-2 animate-in fade-in slide-in-from-top-2 z-50">
                     {secondaryItems.map((item) => (
                        <Link 
                           key={item.path}
                           href={item.path}
                           className={`flex items-center gap-4 px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all active-press ${
                              isActive(item.path) 
                              ? 'bg-slate-950 text-white' 
                              : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
                           }`}
                        >
                           <item.icon className="w-4 h-4" />
                           {item.name}
                        </Link>
                     ))}
                  </div>
               )}
            </div>

            <div className="hidden xl:flex items-center h-full">
               {secondaryItems.map((item) => (
                  <Link 
                     key={item.path}
                     href={item.path}
                     className={`h-full px-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-snap ease-snap border-b-4 active-press ${
                        isActive(item.path) 
                        ? 'border-primary text-slate-950 bg-slate-50' 
                        : 'border-transparent text-slate-400 hover:text-slate-950 hover:bg-slate-50'
                     }`}
                  >
                     <item.icon className="w-4 h-4" />
                     <span>{item.name}</span>
                  </Link>
               ))}
            </div>
          </div>
        </div>

        {/* UTILITIES HUB */}
        <div className="flex items-center h-full">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="h-full px-8 text-slate-400 hover:text-slate-950 transition-all flex items-center gap-4 group border-l border-slate-100 active:bg-slate-50 active-press"
          >
            <Search className="w-5 h-5" />
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-950 text-white rounded-none shadow-sm transition-transform">
               <span className="text-[9px] font-black uppercase tracking-widest">Command_Log</span>
               <span className="text-[9px] font-black opacity-30">·</span>
               <span className="text-[9px] font-black text-slate-400 animate-pulse">LIVE</span>
            </div>
          </button>

          <Link 
            href="/" 
            className="h-full px-8 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-950 hover:bg-slate-50 transition-all border-l border-slate-100 active-press"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline italic px-2 bg-slate-50 border border-slate-100">LOGOUT</span>
          </Link>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden h-full px-6 text-slate-400 hover:text-slate-950 transition-colors border-l border-slate-100 active-press"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* MOBILE GLASS OVERLAY */}
      <div 
        className={`fixed inset-0 z-[90] bg-white lg:hidden transition-all duration-700 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col p-8 pt-32 space-y-4 font-mono">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-6 pl-6 border-l-4 border-slate-400 italic">Command_Matrix</div>
          {navItems.map((item) => (
            <Link 
              key={item.path}
              href={item.path}
              className={`flex items-center justify-between p-6 border border-slate-100 transition-all active-press ${
                isActive(item.path) 
                  ? 'bg-slate-950 border-slate-950 text-white shadow-md' 
                  : 'bg-white text-slate-500 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-5">
                 <item.icon className="w-6 h-6" />
                 <span className="text-[12px] uppercase tracking-[0.3em] font-black">{item.name}</span>
              </div>
              <ChevronDown className="-rotate-90 w-5 h-5 opacity-20" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
