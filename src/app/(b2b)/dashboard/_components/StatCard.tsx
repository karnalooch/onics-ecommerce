// src/app/(b2b)/dashboard/_components/StatCard.tsx
"use client";

import { ArrowUpRight } from "lucide-react";

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
    <div className={`rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl transition-all duration-500 hover:-translate-y-1 ${
      isPrimary 
        ? 'bg-slate-900 text-white shadow-slate-900/20' 
        : 'bg-white border border-slate-100 text-slate-800 shadow-slate-200/50'
    }`}>
      {/* Background Decor */}
      <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl opacity-20 transition-all duration-700 group-hover:scale-150 ${
        isPrimary ? 'bg-primary' : 'bg-slate-100'
      }`} />

      <div className="relative z-10 flex flex-col h-full justify-between">
         <div className="flex items-start justify-between">
            <div className={`p-4 rounded-2xl ${isPrimary ? 'bg-white/10' : 'bg-slate-50 border border-slate-100'}`}>
               <Icon className={`w-6 h-6 ${isPrimary ? 'text-primary' : 'text-slate-400'}`} />
            </div>
            {trend && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                isPrimary ? 'bg-white/10 text-primary' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                <ArrowUpRight className="w-3 h-3" /> {trend}
              </div>
            )}
         </div>

         <div className="mt-8">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isPrimary ? 'text-white/40' : 'text-slate-400'}`}>
              {label}
            </p>
            <h3 className="text-3xl font-black tracking-tight">{value}</h3>
            {subValue && (
              <p className={`text-xs font-medium mt-1 ${isPrimary ? 'text-white/60' : 'text-slate-500'}`}>
                 {subValue}
              </p>
            )}
         </div>
      </div>
    </div>
  );
}
