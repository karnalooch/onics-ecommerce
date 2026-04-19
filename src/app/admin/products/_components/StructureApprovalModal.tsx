// src/app/admin/products/_components/StructureApprovalModal.tsx
"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Layers, Check, X, AlertCircle } from "lucide-react";

interface StructureApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  newCategories: string[];
  newSubcategories: { parent: string, name: string }[];
  newManufacturers: string[];
}

export const StructureApprovalModal = memo(function StructureApprovalModal({
  isOpen, onClose, onApprove, newCategories, newSubcategories, newManufacturers
}: StructureApprovalModalProps) {
  if (!isOpen) return null;

  const total = newCategories.length + newSubcategories.length + newManufacturers.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-white dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-emerald-500 text-white rounded-[20px] shadow-lg shadow-emerald-500/20">
              <GitBranch className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic">Universal <span className="text-emerald-500 underline decoration-emerald-200">Structure</span> Hub</h2>
              <p className="text-slate-500 text-sm font-bold opacity-70 italic">Wykryto {total} nowych, poprawnych elementów struktury w raporcie.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* CATEGORIES */}
             {newCategories.length > 0 && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategorie</h3>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {newCategories.map(cat => (
                         <Badge key={cat} variant="secondary" className="bg-white dark:bg-slate-700 text-emerald-600 font-bold border-emerald-100 text-[10px] py-1 px-3">
                            {cat}
                         </Badge>
                      ))}
                   </div>
                </div>
             )}

             {/* SUBCATEGORIES */}
             {newSubcategories.length > 0 && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-2 mb-4">
                      <Layers className="w-4 h-4 text-blue-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Podkategorie</h3>
                   </div>
                   <div className="space-y-2">
                      {newSubcategories.map((sub, i) => (
                         <div key={i} className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Rodzic: {sub.parent}</span>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">{sub.name}</span>
                         </div>
                      ))}
                   </div>
                </div>
             )}

             {/* MANUFACTURERS */}
             {newManufacturers.length > 0 && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 md:col-span-2">
                   <div className="flex items-center gap-2 mb-4">
                      <Check className="w-4 h-4 text-primary" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nowi Producenci</h3>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {newManufacturers.map(m => (
                         <Badge key={m} className="bg-primary/10 text-primary font-bold border-primary/20 text-[10px] py-1 px-3">
                            {m}
                         </Badge>
                      ))}
                   </div>
                </div>
             )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-[1.5rem] border border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
             <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
             <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 leading-relaxed uppercase tracking-tighter">
                Uwaga: Klikając zatwierdź, dodasz te elementy do Centralnego Rejestru. Pozycje oznaczone jako "Inne" lub "Nieznany" zostały automatycznie wysłane do kwarantanny w Buforze i nie są tu wyświetlane.
             </p>
          </div>

          <div className="flex gap-4 pt-4">
             <Button 
                onClick={onClose}
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl font-black uppercase italic tracking-tighter text-slate-400"
             >
                <X className="w-5 h-5 mr-2" /> Pomiń & Koryguj w Buforze
             </Button>
             <Button 
                onClick={onApprove}
                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase italic tracking-tighter shadow-xl shadow-emerald-500/20"
             >
                <Check className="w-5 h-5 mr-2" /> Zatwierdź Strukturę
             </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
});
