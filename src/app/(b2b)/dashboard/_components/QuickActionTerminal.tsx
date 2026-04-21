"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, Terminal, Box } from "lucide-react";

interface IQuickAction {
  title: string;
  desc: string;
  href: string;
  Icon: any;
  variant?: "primary" | "white";
  badge?: string;
}

export function QuickActionTerminal({ actions }: { actions: IQuickAction[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
       {actions.map((action, idx) => (
         <TerminalCard key={idx} {...action} />
       ))}
    </div>
  );
}

function TerminalCard({ title, desc, href, Icon, variant = "white", badge }: IQuickAction) {
  const isPrimary = variant === "primary";

  return (
    <Link 
      href={href} 
      className={`group flex flex-col p-8 rounded-sm border-2 transition-all active-press relative overflow-hidden h-full ${
        isPrimary 
          ? 'bg-slate-950 border-slate-950 text-white shadow-xl shadow-slate-900/10' 
          : 'bg-white border-slate-100 text-slate-950 hover:border-slate-950 hover:bg-slate-50'
      }`}
    >
      {/* SECTOR INDICATOR */}
      <div className={`absolute top-0 left-0 w-full h-1 ${isPrimary ? 'bg-primary' : 'bg-slate-100 group-hover:bg-primary transition-colors'}`} />
      
      <div className={`w-12 h-12 flex items-center justify-center border-2 mb-8 transition-all ${
        isPrimary ? 'bg-white/5 border-white/10 text-primary' : 'bg-slate-50 border-slate-100 text-slate-300 group-hover:text-primary group-hover:border-primary'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex items-center gap-3 mb-4">
         <h3 className="font-black text-[13px] uppercase tracking-widest italic">{title}</h3>
         {badge && (
            <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 italic tracking-widest">
               {badge}
            </span>
         )}
      </div>

      <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed italic ${isPrimary ? 'text-slate-400' : 'text-slate-400'}`}>
        {desc}
      </p>

      <div className="mt-auto pt-8 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Terminal className={`w-3.5 h-3.5 ${isPrimary ? 'text-slate-800' : 'text-slate-100'}`} />
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${isPrimary ? 'text-slate-700' : 'text-slate-200'}`}>Operational_Mode</span>
         </div>
         <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
      </div>

      {/* DECORATIVE TERMINAL DECOR */}
      <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
         <Box className="w-20 h-20 text-slate-100" />
      </div>
    </Link>
  );
}
