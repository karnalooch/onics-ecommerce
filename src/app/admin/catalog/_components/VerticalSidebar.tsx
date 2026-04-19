// src/app/admin/catalog/_components/VerticalSidebar.tsx
"use client";

import { motion } from "framer-motion";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShieldCheck, LayoutGrid, Brain, Search, Database, Zap } from "lucide-react";

interface IVerticalSidebarProps {
  pendingCount: number;
}

export function VerticalSidebar({ pendingCount }: IVerticalSidebarProps) {
  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col gap-8"
    >
      {/* BRANDING HUB */}
      <div className="glass-card p-6 rounded-[2.5rem] flex flex-col items-center gap-2">
         <div className="relative p-4 bg-slate-900 text-white rounded-[1.5rem] shadow-ks-md">
            <Database className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse border-2 border-slate-900" />
         </div>
         <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mt-2">V12 Core</span>
      </div>

      {/* NAVIGATION PILL */}
      <div className="p-3 bg-white/30 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white/20 dark:border-slate-800/50 shadow-ks-lg">
        <TabsList className="flex flex-col h-auto bg-transparent gap-4 p-0">
          <SidebarNavItem value="crt" icon={<Package className="w-5 h-5" />} label="CRT Registry" />
          <SidebarNavItem 
            value="verify" 
            icon={<ShieldCheck className="w-5 h-5" />} 
            label="Verification" 
            badge={pendingCount} 
            activeColor="data-[state=active]:bg-orange-600"
          />
          <SidebarNavItem value="structure" icon={<LayoutGrid className="w-5 h-5" />} label="Structure" activeColor="data-[state=active]:bg-emerald-600" />
          <SidebarNavItem value="intelligence" icon={<Brain className="w-5 h-5" />} label="AI Hub" activeColor="data-[state=active]:bg-blue-600" />
          
          <div className="h-[1px] w-8 bg-slate-200 dark:bg-slate-800 mx-auto my-2" />
          
          <button 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all group"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </TabsList>
      </div>

      {/* STATUS DOCK */}
      <div className="glass-card px-4 py-6 rounded-[2rem] flex flex-col items-center gap-4">
         <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] relative z-10" />
         </div>
         <div className="rotate-90 origin-center whitespace-nowrap">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-400">Operational</span>
         </div>
      </div>
    </motion.aside>
  );
}

function SidebarNavItem({ value, icon, label, badge, activeColor = "data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-white" }: any) {
  return (
    <TabsTrigger 
      value={value}
      className={`relative w-14 h-14 rounded-2xl transition-all duration-500 ${activeColor} data-[state=active]:text-white dark:data-[state=active]:text-slate-950 group flex items-center justify-center shadow-none data-[state=active]:shadow-ks-md`}
    >
      <div className="relative z-10">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-4 -right-4 bg-orange-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
            {badge}
          </span>
        )}
      </div>
      
      {/* Tooltip on Hover */}
      <div className="absolute left-20 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap shadow-ks-lg">
        {label}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-8 border-transparent border-right-slate-900 h-0 w-0" />
      </div>
    </TabsTrigger>
  );
}
