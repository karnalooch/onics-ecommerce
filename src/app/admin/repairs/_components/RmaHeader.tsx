"use client";

import { Plus, ShieldAlert, Terminal } from "lucide-react";

interface IRmaHeaderProps {
  onAddClick: () => void;
}

export function RmaHeader({ onAddClick }: IRmaHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pb-6 border-b border-black/5 dark:border-white/10">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-primary/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
             <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Service Hub (RMA)</span>
             <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
             <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Diagnostic_v9</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-1">Obsługa Serwisowa</h1>
        </div>
      </div>

      <button 
        onClick={onAddClick}
        className="h-14 px-10 bg-primary text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-4 transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-primary/20 rounded-xl"
      >
        <Plus className="w-5 h-5 shadow-glow" /> NOWE ZGŁOSZENIE RMA
      </button>
    </div>
  );
}
