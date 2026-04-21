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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 no-blur">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[540px] bg-white relative z-10 overflow-hidden shadow-2xl border-none p-0 flex flex-col"
      >
        <div className="bg-slate-950 px-8 py-5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">NOWE_ZGŁOSZENIE_RMA</h3>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
           <div className="grid grid-cols-1 gap-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">KOD_MODELU / NAZWA</label>
                 <div className="relative group">
                    <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
                    <input 
                       required
                       value={formData.deviceModel}
                       onChange={e => setFormData({...formData, deviceModel: e.target.value.toUpperCase()})}
                       className="w-full h-12 pl-12 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase italic outline-none focus:bg-white focus:border-primary transition-all"
                       placeholder="NP. SATEL_INTEGRA_128"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">NUMER_SERYJNY (S/N)</label>
                 <div className="relative group">
                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
                    <input 
                       required
                       value={formData.serialNumber}
                       onChange={e => setFormData({...formData, serialNumber: e.target.value.toUpperCase()})}
                       className="w-full h-12 pl-12 bg-slate-50 border border-slate-100 text-[12px] font-mono font-bold outline-none focus:bg-white focus:border-primary transition-all"
                       placeholder="S/N_00000000"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">IDENTYFIKATOR_PARTNERA</label>
                 <input 
                    required
                    value={formData.clientName}
                    onChange={e => setFormData({...formData, clientName: e.target.value})}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase outline-none focus:bg-white focus:border-primary transition-all"
                    placeholder="NAZWA FIRMY B2B"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">OPIS_USTERKI_TECHNICZNEJ</label>
                 <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-100 text-[12px] font-bold outline-none focus:bg-white focus:border-primary transition-all resize-none"
                    placeholder="SZCZEGÓŁOWY PROTOKÓŁ BŁĘDÓW..."
                 />
              </div>
           </div>

           <div className="pt-4 flex items-center gap-4">
              <button 
                 type="button" 
                 onClick={onClose}
                 className="flex-1 h-12 border-2 border-slate-950 text-slate-950 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active-press"
              >
                 ANULUJ_PROCES
              </button>
              <button 
                 type="submit"
                 className="flex-1 h-12 bg-primary text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:brightness-110 active-press italic"
              >
                 <Save className="w-4 h-4" /> REJESTRUJ_RMA
              </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
}
