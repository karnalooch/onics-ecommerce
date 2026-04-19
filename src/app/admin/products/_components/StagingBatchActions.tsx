// src/app/admin/products/_components/StagingBatchActions.tsx
"use client";

import { useState } from "react";
import { Check, Layers, User, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface IStagingBatchActionsProps {
  selectedIds: string[];
  onBatchUpdate: (ids: string[], field: string, value: any) => void;
  onBatchCommit: (ids: string[]) => void;
  categories: any[];
  manufacturers: string[];
}

export function StagingBatchActions({ 
  selectedIds, onBatchUpdate, onBatchCommit, categories, manufacturers 
}: IStagingBatchActionsProps) {

  if (selectedIds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 150, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 150, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-auto"
      >
        <div className="flex items-center gap-2 p-2 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[3rem] border-2 border-white/10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* SELECTION INDICATOR MOLECULUE */}
          <div className="flex items-center gap-5 px-8 mr-2 border-r border-white/5">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full animate-pulse" />
                <div className="relative p-4 bg-primary text-slate-900 rounded-[1.2rem] shadow-2xl">
                   <Zap className="w-5 h-5 fill-current" />
                </div>
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.3em] italic">Wyselekcjonowane</span>
                <span className="text-2xl font-black italic text-white tracking-tighter tabular-nums leading-none">
                  {selectedIds.length} <span className="text-[10px] NOT-italic">POZ.</span>
                </span>
             </div>
          </div>

          {/* BATCH SELECTORS GROUP */}
          <div className="flex items-center gap-4 px-4">
             {/* Category Multi-Update */}
             <div className="flex items-center gap-3 group">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                  <Layers className="w-4 h-4 text-slate-400 group-hover:text-primary" />
                </div>
                <Select onValueChange={(val) => onBatchUpdate(selectedIds, 'categoryId', val)}>
                   <SelectTrigger className="w-[200px] h-12 rounded-[1.2rem] bg-white/5 border-none text-white font-black text-[10px] uppercase tracking-widest focus:ring-2 focus:ring-primary/40 transition-all">
                      <SelectValue placeholder="Masowa Kategoria" />
                   </SelectTrigger>
                   <SelectContent className="rounded-[1.5rem] border-2 border-slate-800 bg-slate-900 text-white shadow-2xl p-2">
                      {categories.map((c: any) => (
                         <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[9px] tracking-[0.2em] py-3 rounded-xl hover:bg-primary hover:text-slate-900">
                            {c.name}
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>

             <div className="h-8 w-[1px] bg-white/5" />

             {/* Manufacturer Multi-Update */}
             <div className="flex items-center gap-3 group">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                  <User className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                </div>
                <Select onValueChange={(val) => onBatchUpdate(selectedIds, 'manufacturer', val)}>
                   <SelectTrigger className="w-[200px] h-12 rounded-[1.2rem] bg-white/5 border-none text-white font-black text-[10px] uppercase tracking-widest focus:ring-2 focus:ring-blue-500/40 transition-all">
                      <SelectValue placeholder="Masowy Producent" />
                   </SelectTrigger>
                   <SelectContent className="rounded-[1.5rem] border-2 border-slate-800 bg-slate-900 text-white shadow-2xl p-2">
                      {manufacturers.map((m: string) => (
                         <SelectItem key={m} value={m} className="font-black uppercase text-[9px] tracking-[0.2em] py-3 rounded-xl hover:bg-blue-500 hover:text-white">
                            {m}
                         </SelectItem>
                      ))}
                   </SelectContent>
                </Select>
             </div>
          </div>

          {/* FINAL BATCH ACTION */}
          <div className="ml-4 pl-4 border-l border-white/5">
             <Button 
               onClick={() => onBatchCommit(selectedIds)}
               className="h-16 px-10 rounded-[1.8rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_15px_30px_rgba(16,185,129,0.3)] hover:scale-[1.05] active:scale-95 transition-all gap-4 flex items-center group/btn"
             >
                <span>Autoryzuj Wybrane</span>
                <div className="p-2 bg-white/10 rounded-lg group-hover/btn:bg-white/20">
                  <Check className="w-4 h-4" />
                </div>
             </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
