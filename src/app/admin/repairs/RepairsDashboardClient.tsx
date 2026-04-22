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
    <div className="flex flex-col gap-12 animate-in fade-in duration-700 pb-20 select-none max-w-[1920px] mx-auto">
      
      {/* 1. MISSION CONTROL RMA HEADER (FLUENT) */}
      <RmaHeader onAddClick={() => setIsFormOpen(true)} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* COMMAND & STATUS PANELS (LEFT) */}
        <div className="xl:col-span-8 space-y-8">
           <RmaStats rmas={rmas} />
           
           <div className="fluent-card p-0 border-white/10 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-black/5 dark:border-white/10 bg-primary/5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-primary" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Rejestr Zgłoszeń Serwisowych</h3>
                 </div>
                 <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-transparent">Log: {rmas.length} Elt</Badge>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-glow" />
                 </div>
              </div>
              <RmaTable rmas={rmas} onUpdate={setRmas} />
           </div>
        </div>

        {/* DIAGNOSTIC TOOLS & KNOWLEDGE (RIGHT) */}
        <aside className="xl:col-span-4 space-y-8">
           
           {/* HIGH-DENSITY S/N VERIFICATION ENGINE (FLUENT GLOW) */}
           <div className="fluent-card p-10 border-white/10 shadow-3xl relative overflow-hidden group bg-[#1e2335]/90 text-white">
              {/* Modern Grid Overlay */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ 
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
              }} />

              <div className="relative z-10 space-y-10">
                 <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                       <Zap className="w-6 h-6 text-primary animate-pulse" /> Weryfikator <span className="text-primary italic">S/N</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold opacity-60">Gwarancja Baza Celtronics v9</p>
                 </div>

                 <div className="flex gap-4">
                    <div className="relative flex-1 group/input">
                       <input 
                          type="text" 
                          value={snSearch}
                          onChange={(e) => setSnSearch(e.target.value.toUpperCase())}
                          placeholder="Skanuj lub wpisz numer..."
                          className="w-full bg-white/5 border border-white/10 h-14 px-6 text-[13px] font-bold uppercase tracking-widest text-white outline-none focus:bg-white/10 focus:border-primary/40 transition-all rounded-xl shadow-inner"
                       />
                       <Database className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/input:text-primary transition-colors" />
                    </div>
                    <button 
                       onClick={handleVerifySN}
                       className="w-14 h-14 bg-primary text-white flex items-center justify-center rounded-xl hover:brightness-110 active:scale-95 shadow-xl shadow-primary/30 transition-all"
                    >
                       <ChevronRight className="w-6 h-6" />
                    </button>
                 </div>

                 {snResult ? (
                    <motion.div 
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-8 backdrop-blur-xl"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                             <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[12px] font-bold uppercase text-green-400 tracking-widest">Gwarancja Aktywna</span>
                             <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 gap-8 pt-8 border-t border-white/5 font-mono">
                          <div className="flex flex-col gap-2">
                             <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Weryfikacja Modelu</span>
                             <span className="text-[15px] font-bold text-white uppercase italic tracking-tight">{snResult.device}</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-white/5 pt-6">
                             <div className="flex flex-col gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Ważna Do Dnia</span>
                                <span className="text-[15px] font-bold text-primary italic uppercase tracking-widest">{snResult.expiry}</span>
                             </div>
                             <ShieldAlert className="w-6 h-6 text-primary shadow-glow" />
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-12 opacity-20 border border-white/5 border-dashed rounded-3xl">
                       <ShieldAlert className="w-12 h-12 mb-5 text-white" />
                       <span className="text-[11px] font-bold text-white uppercase tracking-widest italic leading-none">Oczekiwanie na identyfikację...</span>
                    </div>
                 )}
              </div>
           </div>

           {/* OPERATIONAL ANALYTICS (FLUENT) */}
           <div className="fluent-card p-0 border-white/10 shadow-2xl overflow-hidden group">
              <div className="px-8 py-5 bg-primary/5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Parametry Operacyjne</h3>
                 <Activity className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="p-8 space-y-8">
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Obciążenie Kolejki</span>
                       <span className="text-[12px] font-bold text-foreground">74%</span>
                    </div>
                    <div className="h-2 bg-black/5 dark:bg-white/5 w-full rounded-full overflow-hidden shadow-inner">
                       <motion.div 
                          className="h-full bg-primary" 
                          initial={{ width: 0 }}
                          animate={{ width: "74%" }}
                       />
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-4">
                       <HardDrive className="w-5 h-5 text-muted-foreground" />
                       <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Logistyka: Online</span>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-transparent font-bold tracking-widest py-1 px-4">OPERATIONAL</Badge>
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
