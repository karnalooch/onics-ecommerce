// src/app/admin/products/_components/StagingItem.tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertTriangle, RefreshCw, FileText, Brain, ArrowDownRight, Zap, Database, ExternalLink, Trash2 } from "lucide-react";
import { memo } from "react";

interface IStagingItemProps {
  item: any;
  categories: any[];
  manufacturers: string[];
  onUpdate: (tempId: string, field: string, value: any) => void;
  onCommit: (tempId: string) => void;
  onRemove: (id: string, sku: string) => void;
  isItemConfirmed: (item: any) => boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export const StagingItem = memo(function StagingItem({
  item, categories, manufacturers, onUpdate, onCommit, onRemove, isItemConfirmed,
  isSelected, onToggleSelect
}: IStagingItemProps) {
  const isConfirmed = isItemConfirmed(item);
  const selectedCat = categories.find(c => c.id === item.categoryId);

  return (
    <div 
      className={`relative flex flex-col xl:flex-row items-center gap-6 p-5 border-b border-slate-50 transition-all group select-none no-blur bg-white ${
        isConfirmed ? 'bg-slate-50/50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
      }`}
    >
      
      {/* 1. SELECTION & STATUS GEARS */}
      <div className="shrink-0 flex items-center gap-4">
         <div className="relative h-6 w-6">
            <input 
               type="checkbox" 
               checked={isSelected} 
               onChange={onToggleSelect}
               className="h-6 w-6 bg-white border border-slate-200 text-slate-950 focus:ring-slate-950 cursor-pointer appearance-none checked:bg-slate-950 transition-colors rounded-none"
            />
            {isSelected && <Check className="absolute inset-0 m-auto w-4 h-4 text-white pointer-events-none" />}
         </div>
         <div className={`w-10 h-10 flex items-center justify-center transition-all ${
           isConfirmed ? 'bg-primary text-white' : (item.qualityLevel === 'LOW' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400')
         }`}>
           {isConfirmed ? <Check className="w-5 h-5" /> : (item.qualityLevel === 'LOW' ? <AlertTriangle className="w-5 h-5" /> : <Database className="w-5 h-5" />)}
         </div>
      </div>

      {/* 2. CORE IDENTITY (EDITABLE) */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
         <div className="flex items-center gap-3">
            <input 
               value={item.name} 
               onChange={(e) => onUpdate(item.tempId, 'name', e.target.value)}
               className="flex-1 bg-transparent text-[13px] font-black uppercase tracking-tight text-slate-950 outline-none border-b border-transparent focus:border-primary transition-all pr-4"
               placeholder="NAZWA_PRODUKTU"
            />
            <span className="shrink-0 h-6 px-3 bg-slate-100 flex items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</span>
         </div>
         
         <div className="flex flex-wrap gap-2 mt-1">
            {item.qualityReason && (
               <div className="h-5 px-2 bg-slate-950 text-primary text-[8px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                  <Brain className="w-3 h-3" /> IQ: {item.qualityReason}
               </div>
            )}
            {item.priceMismatch && (
               <div className="h-5 px-2 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> PRICE_DELTA_DETECTED
               </div>
            )}
            {item.catalogSpecs && (
               <div className="h-5 px-2 bg-slate-50 border border-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-3 h-3" /> SPEC_V9_ATTACHED
               </div>
            )}
         </div>
      </div>

      {/* 3. CLASSIFICATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full xl:w-[350px]">
         <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Kategoria</span>
            <select 
               value={item.categoryId || ""} 
               onChange={(e) => onUpdate(item.tempId, 'categoryId', e.target.value)}
               className="h-9 px-3 bg-white border border-slate-100 text-[9px] font-black uppercase outline-none focus:border-primary transition-all text-slate-950"
            >
               <option value="">-- BRAK --</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
         </div>
         <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Podkategoria</span>
            <select 
               value={item.subcategoryId || ""} 
               onChange={(e) => onUpdate(item.tempId, 'subcategoryId', e.target.value)}
               disabled={!item.categoryId}
               className="h-9 px-3 bg-white border border-slate-100 text-[9px] font-black uppercase outline-none focus:border-primary transition-all text-slate-950 disabled:opacity-20"
            >
               <option value="">-- BRAK --</option>
               {selectedCat?.subcategories?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
         </div>
         <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Producent</span>
            <select 
               value={item.manufacturer || ""} 
               onChange={(e) => onUpdate(item.tempId, 'manufacturer', e.target.value)}
               className="h-9 px-3 bg-white border border-slate-100 text-[9px] font-black uppercase outline-none focus:border-primary transition-all text-slate-950"
            >
               <option value="">-- AUTO --</option>
               {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
         </div>
      </div>

      {/* 4. PRICING LOGIC */}
      <div className="flex items-center gap-4 shrink-0">
         <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
               {item.priceMismatch && (
                  <button 
                    onClick={() => onUpdate(item.tempId, 'price', item.catalogPrice)}
                    className="h-10 px-3 bg-red-600 text-white font-black hover:brightness-110 transition-all active-press"
                    title={`SYNK: ${item.catalogPrice} PLN`}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
               )}
               <div className="relative">
                  <input 
                    type="number"
                    value={item.price}
                    onChange={(e) => onUpdate(item.tempId, 'price', parseFloat(e.target.value))}
                    className={`h-11 w-[120px] text-right pr-3 font-black text-[15px] bg-slate-50 border transition-all tabular-nums outline-none ${
                        item.priceMismatch ? 'border-red-600 text-red-600' : 'border-transparent text-slate-950'
                    }`}
                  />
               </div>
            </div>
            {item.priceMismatch && (
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Katalog: {item.catalogPrice} PLN</span>
            )}
         </div>

         {/* ACTIONS */}
         <div className="flex items-center gap-2 pr-4">
            {isConfirmed && (
               <button 
                  onClick={() => onCommit(item.tempId)}
                  className="h-11 px-5 bg-primary text-white font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active-press"
               >
                  DODAJ
               </button>
            )}
            <button 
               onClick={() => onRemove(item.tempId, item.sku)}
               className="h-11 w-11 flex items-center justify-center bg-white border border-slate-100 text-slate-200 hover:text-red-600 hover:border-red-100 transition-all active-press"
            >
               <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
});
