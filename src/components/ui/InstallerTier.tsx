"use client";

import { Award, ShieldCheck, Sparkles, Terminal, Database } from "lucide-react";

interface InstallerTierProps {
  currentLevel: string;
  discount: number;
}

export function InstallerTier({ currentLevel, discount }: InstallerTierProps) {
  return (
    <div className="bg-white border-2 border-slate-950 p-10 h-full relative overflow-hidden group select-none flex flex-col justify-between transition-all duration-300 shadow-xl shadow-slate-900/5">
      
      {/* ELITE DECORATIVE GRID */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_top_right,transparent_20%,black)] pointer-events-none opacity-20" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center border border-white/10 shadow-lg">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">PLATFORM_PARTNER</span>
                 <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">Verified_Access</span>
              </div>
            </div>
            
            <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none italic mt-8">
               LEVEL: <span className="text-primary NOT-italic">{currentLevel}</span>
            </h2>
            <div className="flex items-center gap-4 mt-4">
               <div className="h-[2px] w-6 bg-primary" />
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Standard handlowy sektora MSWiA</p>
            </div>
          </div>
          
          <div className="relative shrink-0">
             <div className="bg-slate-950 p-8 border-2 border-primary flex flex-col items-center justify-center min-w-[140px] shadow-2xl shadow-primary/10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-none mb-3">GLOBAL_DISCOUNT</span>
                <span className="text-5xl font-black text-white italic leading-none tabular-nums">-{discount}<span className="text-primary NOT-italic text-2xl">%</span></span>
             </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t-2 border-slate-950 space-y-8">
          <div className="flex items-center gap-6 group/item">
             <div className="w-14 h-14 bg-slate-50 border-2 border-slate-100 flex items-center justify-center transition-all group-hover/item:border-primary group-hover/item:bg-white active-press">
                <ShieldCheck className="w-7 h-7 text-primary" />
             </div>
             <div className="flex flex-col">
                <p className="text-[12px] font-black text-slate-950 uppercase italic tracking-tighter">Status_Systemowy: Autoryzowany</p>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Pełna ewidencja cen hurtowych B2B aktywna</p>
             </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 text-white px-6 py-4 border-l-4 border-primary">
             <Terminal className="w-4 h-4 text-primary" />
             <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Warunki przydzielane indywidualnie w klastrze PIM</span>
          </div>
        </div>
      </div>
      
      {/* OPERATIONAL BG TEXT */}
      <div className="absolute -bottom-8 -right-8 opacity-[0.03] select-none pointer-events-none">
         <span className="text-[120px] font-black text-slate-950 uppercase tracking-tighter italic">CERTIFIED</span>
      </div>
    </div>
  );
}
