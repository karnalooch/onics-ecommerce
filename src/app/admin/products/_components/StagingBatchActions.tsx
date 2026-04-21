// src/app/admin/products/_components/StagingBatchActions.tsx
"use client";

import { useState } from "react";
import { Check, Layers, User, Zap, Activity, Database, ChevronRight } from "lucide-react";
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
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-auto select-none no-blur"
      >
        <div className="flex items-center gap-0 bg-slate-950 text-white border border-slate-800 shadow-2xl overflow-hidden rounded-none h-14">
          
          {/* 1. SELECTION QUANTUM */}
          <div className="flex items-center gap-4 px-6 border-r border-slate-800 h-full bg-slate-900/50">
             <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Wybrane</span>
                <span className="text-xl font-black italic text-primary tracking-tighter tabular-nums leading-none">
                  {selectedIds.length} <span className="text-[9px] not-italic opacity-50">PCS</span>
                </span>
             </div>
             <Zap className="w-4 h-4 text-primary fill-current opacity-30" />
          </div>

          {/* 2. BATCH GEARS */}
          <div className="flex items-center gap-6 px-6 h-full">
             {/* Category Multi-Update */}
             <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-slate-500" />
                <select 
                   onChange={(e) => onBatchUpdate(selectedIds, 'categoryId', e.target.value)}
                   className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer focus:text-white transition-colors"
                >
                   <option value="" disabled selected>Zmień Kategorię</option>
                   {categories.map((c: any) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white py-2">
                         {c.name}
                      </option>
                   ))}
                </select>
             </div>

             <div className="w-px h-6 bg-slate-800" />

             {/* Manufacturer Multi-Update */}
             <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-500" />
                <select 
                   onChange={(e) => onBatchUpdate(selectedIds, 'manufacturer', e.target.value)}
                   className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer focus:text-white transition-colors"
                >
                   <option value="" disabled selected>Zmień Producenta</option>
                   {manufacturers.map((m: string) => (
                      <option key={m} value={m} className="bg-slate-900 text-white py-2">
                         {m}
                      </option>
                   ))}
                </select>
             </div>
          </div>

          {/* 3. FINAL EXECUTION */}
          <button 
             onClick={() => onBatchCommit(selectedIds)}
             className="h-full px-10 bg-primary text-white font-black uppercase tracking-[0.3em] text-[10px] italic flex items-center gap-4 hover:brightness-110 active-press transition-all border-l border-white/10"
          >
             <span>MASOWA_AUTORYZACJA</span>
             <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
