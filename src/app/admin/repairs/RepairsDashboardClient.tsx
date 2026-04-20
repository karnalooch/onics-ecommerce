"use client";

import { useState } from "react";
import { RmaHeader } from "./_components/RmaHeader";
import { RmaStats } from "./_components/RmaStats";
import { RmaTable } from "./_components/RmaTable";
import { RmaAddForm } from "./_components/RmaAddForm";
import { Search, ShieldAlert, Cpu, HardDrive, CheckCircle2, ChevronRight, Database } from "lucide-react";

export function RepairsDashboardClient({ initialData }: { initialData: any[] }) {
  const [rmas, setRmas] = useState(initialData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [snSearch, setSnSearch] = useState("");
  const [snResult, setSnResult] = useState<any>(null);

  const handleVerifySN = () => {
    // Technical mock for SN verification logic
    if (snSearch.length > 5) {
      setSnResult({
        status: "WARRANTY_ACTIVE",
        expiry: "2027-12-01",
        device: "Satel Integra 128-WRL",
        distributor: "Celtronics S.C."
      });
    } else {
       setSnResult(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20 font-mono">
      
      {/* 1. MISSION CONTROL RMA HEADER */}
      <RmaHeader onAddClick={() => setIsFormOpen(true)} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* COMMAND & STATUS PANELS (LEFT/TOP) */}
        <div className="xl:col-span-8 space-y-6">
           <RmaStats rmas={rmas} />
           
           <div className="flat-panel p-0 bg-white">
              <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" /> Aktywne Zlecenia Serwisowe
                 </h3>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Registry Count: {rmas.length}</span>
              </div>
              <RmaTable rmas={rmas} onUpdate={setRmas} />
           </div>
        </div>

        {/* VERIFICATION & TOOLS (RIGHT) */}
        <aside className="xl:col-span-4 space-y-6">
           
           {/* HIGH-DENSITY S/N VERIFICATION ENGINE */}
           <div className="flat-panel p-6 bg-slate-950 text-white space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="space-y-1 relative z-10">
                 <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-primary" /> Szybka Weryfikacja <span className="text-primary NOT-italic">S/N</span>
                 </h3>
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Natychmiastowe sprawdzenie statusu gwarancji</p>
              </div>

              <div className="flex gap-2 relative z-10">
                 <input 
                    type="text" 
                    value={snSearch}
                    onChange={(e) => setSnSearch(e.target.value)}
                    placeholder="Wprowadź Numer Seryjny..."
                    className="flex-1 bg-white/5 border border-white/10 h-11 px-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary transition-all"
                 />
                 <button 
                    onClick={handleVerifySN}
                    className="w-12 h-11 bg-primary text-slate-950 flex items-center justify-center hover:brightness-110 active:scale-90 transition-all shadow-lg shadow-primary/20"
                 >
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>

              {snResult && (
                 <div className="bg-white/5 border border-primary/20 p-4 rounded-sm space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                       <CheckCircle2 className="w-5 h-5 text-status-success" />
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-status-success tracking-widest">Gwarancja Aktywna</span>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Weryfikacja Pozytywna</span>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 font-mono">
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 uppercase font-bold">MODEL</span>
                          <span className="text-[10px] font-black text-white truncate">{snResult.device}</span>
                       </div>
                       <div className="flex flex-col items-end text-right">
                          <span className="text-[8px] text-slate-500 uppercase font-bold">EXPIRE</span>
                          <span className="text-[10px] font-black text-white">{snResult.expiry}</span>
                       </div>
                    </div>
                 </div>
              )}
           </div>

           {/* INFRASTRUCTURE MONITORING (Aesthetic Placeholder) */}
           <div className="flat-panel p-5 bg-white space-y-4 border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-4 border-slate-900 pl-4">Zasoby Techniczne</h3>
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Cpu className="w-4 h-4 text-slate-300" />
                       <span className="text-[10px] font-bold text-slate-600">Obciążenie Serwisu</span>
                    </div>
                    <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-[65%]" />
                    </div>
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <HardDrive className="w-4 h-4 text-slate-300" />
                       <span className="text-[10px] font-bold text-slate-600">Części Zamienne</span>
                    </div>
                    <span className="text-[10px] font-black text-status-success uppercase tabular-nums tracking-widest px-2 bg-status-success/10 border border-status-success/20">Optymalne</span>
                 </div>
              </div>
           </div>

        </aside>
      </div>

      {isFormOpen && <RmaAddForm onClose={() => setIsFormOpen(false)} onAdd={(newRma: any) => setRmas([newRma, ...rmas])} />}
    </div>
  );
}
