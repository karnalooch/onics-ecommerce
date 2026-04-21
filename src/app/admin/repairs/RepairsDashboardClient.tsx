"use client";

import { useState } from "react";
import { RmaHeader } from "./_components/RmaHeader";
import { RmaStats } from "./_components/RmaStats";
import { RmaTable } from "./_components/RmaTable";
import { RmaAddForm } from "./_components/RmaAddForm";
import { Search, ShieldAlert, Cpu, HardDrive, CheckCircle2, ChevronRight, Database, Terminal, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";

export function RepairsDashboardClient({ initialData }: { initialData: any[] }) {
  const [rmas, setRmas] = useState(initialData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [snSearch, setSnSearch] = useState("");
  const [snResult, setSnResult] = useState<any>(null);

  const handleVerifySN = () => {
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
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20 no-blur">
      
      {/* 1. MISSION CONTROL RMA HEADER */}
      <RmaHeader onAddClick={() => setIsFormOpen(true)} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* COMMAND & STATUS PANELS (LEFT) */}
        <div className="xl:col-span-8 space-y-8">
           <RmaStats rmas={rmas} />
           
           <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none">
              <div className="p-5 border-b border-slate-100 bg-slate-950 flex items-center justify-between text-white">
                 <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] italic">ACTIVE_SERVICE_REGISTRY</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest tabular-nums">LOG_ENTRY: {rmas.length}</span>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                 </div>
              </div>
              <RmaTable rmas={rmas} onUpdate={setRmas} />
           </div>
        </div>

        {/* DIAGNOSTIC TOOLS & KNOWLEDGE (RIGHT) */}
        <aside className="xl:col-span-4 space-y-8">
           
           {/* HIGH-DENSITY S/N VERIFICATION ENGINE */}
           <div className="satel-card p-8 bg-slate-900 border-none shadow-xl rounded-none relative overflow-hidden group">
              {/* Technical Grid Overlay */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ 
                  backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
              }} />

              <div className="relative z-10 space-y-8">
                 <div className="space-y-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] italic flex items-center gap-3 text-white">
                       <Zap className="w-5 h-5 text-primary" /> Weryfikator <span className="text-primary NOT-italic">S/N</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black italic">Baza_Gwarancji_Celtronics.v4</p>
                 </div>

                 <div className="flex gap-2">
                    <div className="relative flex-1">
                       <input 
                          type="text" 
                          value={snSearch}
                          onChange={(e) => setSnSearch(e.target.value.toUpperCase())}
                          placeholder="SCAN_OR_ENTER_SN..."
                          className="w-full bg-white/5 border-2 border-white/10 h-14 px-5 text-[12px] font-black uppercase tracking-widest text-white outline-none focus:border-primary focus:bg-white/10 transition-all font-mono italic"
                       />
                       <Database className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    </div>
                    <button 
                       onClick={handleVerifySN}
                       className="w-14 h-14 bg-primary text-white flex items-center justify-center hover:brightness-110 active-press shadow-xl shadow-primary/20 transition-all"
                    >
                       <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>

                 {snResult ? (
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="bg-white/10 border-2 border-primary/40 p-6 space-y-6"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-status-success flex items-center justify-center text-white">
                             <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[11px] font-black uppercase text-status-success tracking-widest">Gwarancja_Zatwierdzona</span>
                             <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">ID_VER: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 gap-6 pt-6 border-t border-white/10 font-mono">
                          <div className="flex flex-col gap-1">
                             <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">WYKRYTY_MODEL</span>
                             <span className="text-[13px] font-black text-white italic truncate uppercase">{snResult.device}</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-white/5 pt-4">
                             <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">DATA_EKSPIRACJI</span>
                                <span className="text-[13px] font-black text-primary italic uppercase">{snResult.expiry}</span>
                             </div>
                             <ShieldAlert className="w-5 h-5 text-primary" />
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-10 border-2 border-white/5 border-dashed">
                       <ShieldAlert className="w-10 h-10 mb-4 text-white" />
                       <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] italic">Weryfikator_W_Gatowości</span>
                    </div>
                 )}
              </div>
           </div>

           {/* OPERATIONAL ANALYTICS */}
           <div className="satel-card p-0 bg-white border-none shadow-sm rounded-none overflow-hidden group">
              <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-950 italic">Logistyka_Serwisu</h3>
                 <Activity className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Obciążenie Terminali</span>
                       <span className="text-[10px] font-black text-slate-950">74%</span>
                    </div>
                    <div className="h-1 bg-slate-100 w-full overflow-hidden">
                       <motion.div 
                          className="h-full bg-primary" 
                          initial={{ width: 0 }}
                          animate={{ width: "74%" }}
                       />
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                       <HardDrive className="w-4 h-4 text-slate-300" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Części: STABLE</span>
                    </div>
                    <span className="text-[9px] font-black text-status-success uppercase tabular-nums tracking-widest px-3 py-1 bg-status-success/10 border border-status-success/20">OPERATIONAL</span>
                 </div>
              </div>
           </div>

        </aside>
      </div>

      {isFormOpen && (
        <RmaAddForm 
          onClose={() => setIsFormOpen(false)} 
          onAdd={(newRma: any) => {
            setRmas([newRma, ...rmas]);
            // toast.success("RMA_REGISTERED: Zgłoszenie przyjęte do systemu.");
          }} 
        />
      )}
    </div>
  );
}
