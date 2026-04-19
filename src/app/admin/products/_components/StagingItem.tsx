// src/app/admin/products/_components/StagingItem.tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertTriangle, RefreshCw, FileText, Brain, ArrowDownRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`relative p-8 rounded-[3rem] border-2 transition-all duration-500 overflow-hidden ${
        isConfirmed 
          ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-2xl shadow-emerald-500/10' 
          : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border-slate-100 dark:border-slate-800 shadow-xl'
      }`}
    >
      <div className="flex flex-col xl:flex-row gap-10 items-center">
        
        {/* SELECTION BOX */}
        <div className="shrink-0 flex items-center gap-6">
           <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={onToggleSelect}
                className="w-8 h-8 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-primary focus:ring-primary cursor-pointer transition-all appearance-none checked:bg-primary checked:border-primary"
              />
              {isSelected && <Check className="absolute inset-x-0 mx-auto w-4 h-4 text-white pointer-events-none" />}
           </div>
           
           <div className={`p-4 rounded-2xl shadow-xl transition-all ${
             isConfirmed ? 'bg-emerald-500 text-white' : (item.qualityLevel === 'LOW' ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')
           }`}>
             {isConfirmed ? <Check className="w-6 h-6" /> : (item.qualityLevel === 'LOW' ? <AlertTriangle className="w-6 h-6" /> : <Zap className="w-6 h-6" />)}
           </div>
        </div>

        {/* IDENTITY BENTO */}
        <div className="flex-1 min-w-0 space-y-3">
           <div className="relative group">
              <input 
                value={item.name} 
                onChange={(e) => onUpdate(item.tempId, 'name', e.target.value)}
                className="w-full bg-transparent text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white outline-none border-b-2 border-transparent focus:border-primary transition-all pr-12"
              />
              <Badge className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-100 dark:bg-slate-800 text-slate-400 border-none font-mono text-[9px] tracking-widest px-3 py-1 rounded-lg">
                {item.sku}
              </Badge>
           </div>
           
           <div className="flex flex-wrap gap-3">
              {item.qualityReason && (
                 <div className={`px-3 py-1 rounded-full border flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${
                   item.qualityLevel === 'HIGH' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                 }`}>
                    <Brain className="w-3 h-3" /> IQ: {item.qualityReason}
                 </div>
              )}
              {item.priceMismatch && (
                <div className="px-3 py-1 rounded-full bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-600/20">
                  <AlertTriangle className="w-3 h-3" /> Delta Wykryta
                </div>
              )}
              {item.catalogSpecs && (
                <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Spec Ready
                </div>
              )}
           </div>
        </div>

        {/* SELECTORS BENTO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-[40%]">
          <div className="space-y-1">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">Kategoria</label>
             <select 
               value={item.categoryId || ""} 
               onChange={(e) => onUpdate(item.tempId, 'categoryId', e.target.value)}
               className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-primary transition-all dark:text-white"
             >
               <option value="">Wybierz...</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">Podkategoria</label>
             <select 
               value={item.subcategoryId || ""} 
               onChange={(e) => onUpdate(item.tempId, 'subcategoryId', e.target.value)}
               disabled={!item.categoryId}
               className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-primary transition-all disabled:opacity-20 dark:text-white"
             >
               <option value="">Podkat...</option>
               {selectedCat?.subcategories?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
          </div>
          <div className="space-y-1">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">Producent</label>
             <select 
               value={item.manufacturer || ""} 
               onChange={(e) => onUpdate(item.tempId, 'manufacturer', e.target.value)}
               className="w-full h-12 px-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-primary transition-all dark:text-white"
             >
               <option value="">Nieznany</option>
               {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
        </div>

        {/* PRICING & FINAL ACTIONS */}
        <div className="flex items-center gap-6 shrink-0">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-3">
                 {item.priceMismatch && (
                    <button 
                      onClick={() => onUpdate(item.tempId, 'price', item.catalogPrice)}
                      className="p-3 bg-orange-600 text-white rounded-xl hover:scale-110 transition-all shadow-lg shadow-orange-600/20"
                      title={`Koryguj do ceny katalogowej: ${item.catalogPrice} PLN`}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                 )}
                 <div className="relative">
                    <input 
                      type="number"
                      value={item.price}
                      onChange={(e) => onUpdate(item.tempId, 'price', parseFloat(e.target.value))}
                      className={`w-32 h-14 text-right pr-4 font-black text-2xl bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none border-2 transition-all ${
                        item.priceMismatch ? 'border-orange-500 text-orange-600 ring-4 ring-orange-500/10' : 'border-transparent text-slate-900 dark:text-white'
                      }`}
                    />
                    <span className="absolute -top-6 right-0 text-[8px] font-black uppercase text-slate-400 tracking-widest">Wartość Netto (PLN)</span>
                 </div>
              </div>
              {item.priceMismatch && (
                <div className="flex items-center gap-1 text-orange-600 font-black text-[9px] mt-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-950/20 rounded-full border border-orange-100 dark:border-orange-900/30">
                  <ArrowDownRight className="w-3 h-3" />
                  Katalog: {item.catalogPrice} PLN
                </div>
              )}
           </div>

           <div className="flex items-center gap-3">
              {isConfirmed && (
                <button 
                  onClick={() => onCommit(item.tempId)}
                  className="p-5 bg-emerald-500 text-white rounded-3xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-90"
                >
                  <Check className="w-6 h-6" />
                </button>
              )}
              <button 
                onClick={() => onRemove(item.tempId, item.sku)}
                className="p-5 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-3xl border-2 border-slate-100 dark:border-slate-800 hover:text-red-500 hover:border-red-500 transition-all"
              >
                <Trash2 className="w-6 h-6" />
              </button>
           </div>
        </div>
      </div>
      
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className={`absolute -right-20 -bottom-20 w-64 h-64 blur-[100px] rounded-full opacity-20 pointer-events-none transition-colors duration-1000 ${
        isConfirmed ? 'bg-emerald-500' : (item.priceMismatch ? 'bg-orange-500' : 'bg-primary')
      }`} />
    </motion.div>
  );
});
