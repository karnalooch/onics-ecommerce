"use client";

import { Plus, ShieldAlert, Terminal } from "lucide-react";

interface IRmaHeaderProps {
  onAddClick: () => void;
}

export function RmaHeader({ onAddClick }: IRmaHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-6 border-b-2 border-slate-950 pb-8 no-blur">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center shadow-xl">
          <ShieldAlert className="w-7 h-7 text-primary" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">SERVICE_MODULE</span>
             <div className="w-8 h-[1px] bg-slate-200" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">RMA_Diagnostic_v4</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Obsługa Serwisowa</h1>
        </div>
      </div>

      <button 
        onClick={onAddClick}
        className="h-12 px-8 bg-slate-950 text-white font-black uppercase text-[11px] tracking-widest flex items-center gap-4 transition-all hover:bg-primary active-press italic shadow-xl shadow-primary/10"
      >
        <Plus className="w-4 h-4 text-primary" /> DODAJ_ZGŁOSZENIE_RMA
      </button>
    </div>
  );
}
