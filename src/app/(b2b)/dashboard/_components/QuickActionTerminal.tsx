// src/app/(b2b)/dashboard/_components/QuickActionTerminal.tsx
"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface IQuickAction {
  title: string;
  desc: string;
  href: string;
  Icon: any;
  variant: "primary" | "white";
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

function TerminalCard({ title, desc, href, Icon, variant, badge }: IQuickAction) {
  const isPrimary = variant === "primary";

  return (
    <Link 
      href={href} 
      className={`group flex flex-col p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-primary/10 ${
        isPrimary 
          ? 'bg-slate-900 border-slate-900 text-white shadow-slate-900/10' 
          : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50 hover:border-primary/20'
      }`}
    >
      <div className={`p-4 rounded-2xl w-fit mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${
        isPrimary ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-primary/5 text-primary'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex items-center gap-3 mb-3">
         <h3 className="font-black text-lg uppercase tracking-tight italic">{title}</h3>
         {badge && <span className="bg-primary text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter">{badge}</span>}
      </div>

      <p className={`text-xs font-semibold leading-relaxed line-clamp-2 ${isPrimary ? 'text-white/50' : 'text-slate-400'}`}>
        {desc}
      </p>

      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all">
         <span className="text-[10px] font-black uppercase tracking-widest text-primary">Dostęp Natychmiastowy</span>
         <ArrowUpRight className="w-4 h-4 text-primary" />
      </div>
    </Link>
  );
}
