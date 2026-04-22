"use client";

import { useState } from "react";
import { X, ShieldAlert, Cpu, Database, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IRmaAddFormProps {
  onClose: () => void;
  onAdd: (rma: any) => void;
}

export function RmaAddForm({ onClose, onAdd }: IRmaAddFormProps) {
  const [formData, setFormData] = useState({
    deviceModel: "",
    serialNumber: "",
    clientName: "",
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Date.now(),
      ...formData,
      status: "PENDING",
      date: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="absolute inset-0 bg-[#0f172a]/40 dark:bg-black/60" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[600px] glass-mica border border-white/20 dark:border-white/10 rounded-[32px] shadow-3xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="bg-primary/5 px-10 py-6 flex items-center justify-between border-b border-black/5 dark:border-white/10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                 <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-widest">Nowe Zgłoszenie RMA</h3>
           </div>
           <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors hover:bg-black/5 rounded-full">
              <X className="w-6 h-6" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-10">
           <div className="grid grid-cols-1 gap-10">
              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Specyfikacja Urządzenia</label>
                 <div className="relative group">
                    <Cpu className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <input 
                       required
                       value={formData.deviceModel}
                       onChange={e => setFormData({...formData, deviceModel: e.target.value.toUpperCase()})}
                       className="w-full h-14 pl-14 bg-black/5 dark:bg-white/5 border border-transparent rounded-2xl text-[14px] font-bold uppercase outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                       placeholder="NP. SATEL INTEGRA 128"
                    />
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Numer Seryjny (S/N)</label>
                 <div className="relative group">
                    <Database className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <input 
                       required
                       value={formData.serialNumber}
                       onChange={e => setFormData({...formData, serialNumber: e.target.value.toUpperCase()})}
                       className="w-full h-14 pl-14 bg-black/5 dark:bg-white/5 border border-transparent rounded-2xl text-[14px] font-mono font-bold outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                       placeholder="S/N 00000000"
                    />
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Identyfikator Partnera B2B</label>
                 <input 
                    required
                    value={formData.clientName}
                    onChange={e => setFormData({...formData, clientName: e.target.value})}
                    className="w-full h-14 px-6 bg-black/5 dark:bg-white/5 border border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                    placeholder="NAZWA FIRMY..."
                 />
              </div>

              <div className="space-y-3">
                 <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Opis Usterki Technicznej</label>
                 <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-6 bg-black/5 dark:bg-white/5 border border-transparent rounded-2xl text-[14px] font-medium outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all resize-none shadow-inner"
                    placeholder="SZCZEGÓŁOWY OPIS PROBLEMU..."
                 />
              </div>
           </div>

           <div className="pt-6 flex items-center gap-6">
              <button 
                 type="button" 
                 onClick={onClose}
                 className="flex-1 h-14 bg-black/5 dark:bg-white/5 text-muted-foreground font-bold text-[11px] uppercase tracking-widest rounded-2xl hover:text-foreground transition-all active:scale-95 shadow-sm"
              >
                 ANULUJ PROCES
              </button>
              <button 
                 type="submit"
                 className="flex-1 h-14 bg-primary text-white font-bold text-[11px] uppercase tracking-widest shadow-xl shadow-primary/30 flex items-center justify-center gap-4 transition-all hover:brightness-110 active:scale-95 rounded-2xl"
              >
                 <Save className="w-5 h-5 shadow-glow" /> REJESTRUJ ZGŁOSZENIE
              </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
}
