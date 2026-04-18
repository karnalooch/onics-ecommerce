// src/app/admin/products/_components/StagingItem.tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { X, Check, AlertTriangle, RefreshCw, FileText } from "lucide-react";
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
}

export const StagingItem = memo(function StagingItem({
  item, categories, manufacturers, onUpdate, onCommit, onRemove, isItemConfirmed
}: IStagingItemProps) {
  const isConfirmed = isItemConfirmed(item);
  const selectedCat = categories.find(c => c.id === item.categoryId);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -200 }}
      className={`p-6 rounded-[2.5rem] border-2 transition-all ${
        isConfirmed ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-500/5' : 'bg-white border-white shadow-lg'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Info & Status */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center">
           {isConfirmed ? (
             <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
               <Check className="w-5 h-5" />
             </div>
           ) : (
             <div className="text-[10px] font-black text-orange-200 rotate-90 whitespace-nowrap tracking-[0.2em] mb-4">EDYTUJESZ</div>
           )}
        </div>

        {/* Product Identity */}
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-1">
             <input 
               value={item.name} 
               onChange={(e) => onUpdate(item.tempId, 'name', e.target.value)}
               className="text-lg font-black text-slate-800 bg-transparent border-b-2 border-transparent focus:border-orange-500 outline-none w-full"
             />
             <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-[9px] font-black text-slate-400 border-slate-200 uppercase">{item.sku}</Badge>
                {item.priceMismatch && <Badge className="bg-orange-500 text-[8px] font-black italic shadow-lg shadow-orange-500/20">CENNIK MISMATCH</Badge>}
                {item.catalogSpecs && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onUpdate(item.tempId, 'seoDescription', item.catalogSpecs)}
                    className="h-6 px-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 gap-1 flex items-center"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase">Sync Opis</span>
                  </Button>
                )}
             </div>
          </div>
        </div>

        {/* Classification Selectors */}
        <div className="lg:col-span-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
           {/* Category Selection Logic... (Simplified for 30-line rule sub-components) */}
           <StagingSelectors 
             item={item} 
             categories={categories} 
             manufacturers={manufacturers} 
             onUpdate={onUpdate} 
             selectedCat={selectedCat}
           />
        </div>

        {/* Prices & Stocks */}
        <div className="lg:col-span-2 flex items-center justify-end gap-3 px-4">
           <div className="flex flex-col items-end relative">
              <div className="flex items-center gap-2">
                 {item.priceMismatch && (
                   <button 
                     onClick={() => onUpdate(item.tempId, 'price', item.catalogPrice)}
                     title={`Cena w cenniku: ${item.catalogPrice} PLN. Kliknij aby zsynchronizować.`}
                     className="p-1.5 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all animate-pulse"
                   >
                     <RefreshCw className="w-3 h-3" />
                   </button>
                 )}
                 <input 
                   type="number"
                   value={item.price}
                   onChange={(e) => onUpdate(item.tempId, 'price', parseFloat(e.target.value))}
                   className={`w-24 text-right font-black text-xl outline-none rounded-lg pr-2 transition-all ${
                     item.priceMismatch ? 'bg-orange-600 text-white ring-4 ring-orange-500/20' : 'bg-orange-50/50 text-slate-800'
                   }`}
                 />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">PLN Netto</span>
           </div>
           
            <div className="flex items-center gap-2">
               {isConfirmed && (
                 <Button 
                   onClick={() => onCommit(item.tempId)}
                   className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-300"
                 >
                   Zapisz
                 </Button>
               )}
               <button 
                 onClick={() => onRemove(item.tempId, item.sku)}
                 className="w-10 h-10 rounded-2xl bg-white border-2 border-slate-100 text-slate-300 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
        </div>
      </div>
    </motion.div>
  );
});

// SUB-COMPONENTS to keep line count low
function StagingSelectors({ item, categories, manufacturers, onUpdate, selectedCat }: any) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] ml-2">Wydział</label>
        <select 
          value={item.categoryId || ""} 
          onChange={(e) => onUpdate(item.tempId, 'categoryId', e.target.value)}
          className="h-10 px-3 bg-slate-50 border-transparent rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">Wybierz kateg...</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      
      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] ml-2">Podkategoria</label>
        <select 
          value={item.subcategoryId || ""} 
          onChange={(e) => onUpdate(item.tempId, 'subcategoryId', e.target.value)}
          disabled={!item.categoryId}
          className="h-10 px-3 bg-slate-50 border-transparent rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-30"
        >
          <option value="">Wybierz podk...</option>
          {selectedCat?.subcategories?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[8px] font-black uppercase text-slate-300 tracking-[0.2em] ml-2">Producent</label>
        <select 
          value={item.manufacturer || ""} 
          onChange={(e) => onUpdate(item.tempId, 'manufacturer', e.target.value)}
          className="h-10 px-3 bg-slate-50 border-transparent rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20"
        >
          <option value="">Nieznany</option>
          {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </>
  );
}
