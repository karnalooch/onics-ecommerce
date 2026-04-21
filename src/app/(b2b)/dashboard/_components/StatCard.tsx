"use client";

import { ArrowUpRight, TrendingUp } from "lucide-react";

interface IStatCardProps {
  label: string;
  value: string;
  subValue?: string;
  Icon: any;
  variant?: "primary" | "white";
  trend?: string;
}

export function StatCard({ label, value, subValue, Icon, variant = "white", trend }: IStatCardProps) {
  const isPrimary = variant === "primary";

  return (
    <div className={`satel-card p-0 bg-white border-none shadow-sm transition-all relative group h-full overflow-hidden ${
      isPrimary ? 'bg-slate-950 text-white' : 'bg-white text-slate-950 border border-slate-50'
    }`}>
      {/* ELITE DESIGN LINE */}
      <div className={`absolute left-0 top-0 w-1 h-full ${isPrimary ? 'bg-primary' : 'bg-slate-200 group-hover:bg-primary transition-colors'}`} />
      
      <div className="p-8 flex flex-col h-full justify-between relative z-10">
         <div className="flex items-start justify-between">
            <div className={`w-12 h-12 flex items-center justify-center border transition-all ${
               isPrimary ? 'bg-white/5 border-white/10 text-primary' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:border-primary group-hover:text-primary'
            }`}>
               <Icon className="w-5 h-5" />
            </div>
            {trend && (
              <div className={`flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase tracking-widest border italic ${
                isPrimary ? 'bg-white/5 border-white/10 text-primary' : 'bg-status-success/5 text-status-success border-status-success/10'
              }`}>
                <TrendingUp className="w-3 h-3" /> {trend}
              </div>
            )}
         </div>

         <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
               <div className={`w-3 h-[1px] ${isPrimary ? 'bg-primary' : 'bg-slate-200'}`} />
               <p className={`text-[10px] font-black uppercase tracking-[0.3em] italic ${isPrimary ? 'text-slate-500' : 'text-slate-400'}`}>
                 {label}
               </p>
            </div>
            <h3 className="text-4xl font-black tracking-tighter italic leading-none tabular-nums">{value}</h3>
            {subValue && (
              <p className={`text-[10px] font-black uppercase tracking-widest mt-4 italic ${isPrimary ? 'text-slate-500' : 'text-slate-300'}`}>
                 {subValue}
              </p>
            )}
         </div>
      </div>
      
      {/* TECHNICAL INDICATOR */}
      <div className={`absolute bottom-2 right-2 opacity-5 scale-150 transition-transform group-hover:scale-100 ${isPrimary ? 'text-white' : 'text-slate-900'}`}>
         <Icon className="w-12 h-12" />
      </div>
    </div>
  );
}
