// src/app/admin/products/_components/ProductTableRow.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Sparkles, Folder, Brain, Zap, ExternalLink, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface IProductTableRowProps {
  p: any;
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (id: string) => void;
  onSyncIQ: (id: string) => void;
  isGenerating: boolean;
  categories: any[];
}

export function ProductTableRow({ p, onEdit, onDelete, onGenerateAI, onSyncIQ, isGenerating, categories }: IProductTableRowProps) {
  const category = categories.find(c => c.id === p.categoryId);
  const subcategory = category?.subcategories.find((s: any) => s.id === p.subcategoryId);

  const isVirtual = p.isVirtual;
  const hasIqMatch = p.isIqSynced || isVirtual;
  const priceDiffers = !isVirtual && p.catalogPrice && Math.abs(p.catalogPrice - p.price) > 0.01;

  return (
    <div 
      className={`group relative p-6 bg-white/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] border-2 transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl ${
        isVirtual 
          ? 'border-blue-500/30 bg-blue-50/5 grayscale-[0.5] hover:grayscale-0' 
          : (hasIqMatch ? 'border-primary/20 hover:border-primary/50 shadow-blue-500/5' : 'border-white dark:border-slate-800 hover:border-orange-200')
      }`}
    >
       <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
          
          {/* PRODUCT INFO BLOCK */}
          <div className="flex items-center gap-6 w-full lg:w-[40%] text-left">
             <div className="relative shrink-0">
                {isVirtual ? (
                   <div className="p-5 rounded-[1.5rem] bg-blue-500/10 text-blue-500 border-2 border-dashed border-blue-500/30 animate-pulse">
                     <Brain className="w-6 h-6" />
                   </div>
                ) : (
                   <div className={`p-5 rounded-[1.5rem] ${hasIqMatch ? 'bg-blue-100 text-blue-600 shadow-lg shadow-blue-500/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Sparkles className="w-6 h-6" />
                      {hasIqMatch && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800"
                        >
                           <Zap className="w-2.5 h-2.5 text-white fill-white" />
                        </motion.div>
                      )}
                   </div>
                )}
             </div>
             
             <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-3">
                   <h3 className={`text-xl font-black uppercase tracking-tighter truncate ${isVirtual ? 'text-blue-600 flex items-center gap-2' : 'text-slate-800 dark:text-white'}`}>
                      {p.name}
                   </h3>
                   {isVirtual && <Badge className="bg-blue-600 text-white border-none text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full">MASTER IQ</Badge>}
                </div>
                <div className="flex items-center gap-3">
                   <span className="font-mono text-[10px] font-black tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">{p.sku}</span>
                   <span className="text-[10px] font-black uppercase text-slate-400 italic truncate max-w-[200px]">{p.manufacturer || "Brand Inconnu"}</span>
                </div>
             </div>
          </div>

          {/* CATEGORY & CONTEXT */}
          <div className="flex flex-col gap-2 w-full lg:w-[20%]">
             <div className="flex items-center gap-2 group/cat">
                <Folder className="w-4 h-4 text-primary transition-transform group-hover/cat:scale-125" /> 
                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">
                   {category?.name || "Katalog IQ Hub"}
                </span>
             </div>
             {subcategory && (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 text-slate-500 rounded-full border border-slate-200/50 w-fit">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest">{subcategory.name}</span>
                </div>
             )}
          </div>

          {/* PRICE & STOCK BLOCK */}
          <div className="flex items-center gap-8 w-full lg:w-[25%] justify-center lg:justify-start">
             <div className="flex flex-col items-center lg:items-start">
                <div className="flex items-center gap-2">
                   <span className={`text-2xl font-black ${isVirtual ? 'text-blue-600' : (p.price > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-300 italic')}`}>
                      {isVirtual ? `${(p.catalogPrice || 0).toFixed(2)}` : (p.price > 0 ? `${(p.price || 0).toFixed(2)}` : '???')} 
                      <span className="text-xs ml-1 font-bold">PLN</span>
                   </span>
                   {priceDiffers && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[8px] font-black uppercase">Δ MSRP</Badge>}
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">{isVirtual ? 'Sugerowana IQ Hub' : 'Cena Netto Katalog'}</span>
             </div>

             <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${p.stock > 10 ? 'bg-emerald-500 shadow-xl shadow-emerald-500/20' : p.stock > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                   <span className="text-lg font-black text-slate-800 dark:text-white">{p.stock}</span>
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Stan (Szt)</span>
             </div>
          </div>

          {/* ACTION ZEN BAR */}
          <div className="flex items-center gap-3">
             <button 
               onClick={() => onGenerateAI(p.id)} 
               disabled={isGenerating} 
               className={`p-4 rounded-[1.5rem] transition-all group/ai ${p.seoDescription ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-200' : 'bg-blue-600 text-white hover:bg-blue-700 hover:rotate-6 shadow-xl shadow-blue-500/20'}`}
             >
               {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Brain className="w-5 h-5" />}
             </button>

             <div className="flex items-center gap-2 lg:opacity-0 lg:translate-x-4 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-500">
                {isVirtual ? (
                  <button onClick={() => onSyncIQ(p.sku)} className="h-14 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:bg-primary hover:text-white transition-all shadow-2xl">
                    <Zap className="w-4 h-4 fill-current animate-bounce" /> Aktywuj
                  </button>
                ) : (
                  <>
                    <button onClick={() => onEdit(p)} className="p-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 hover:border-primary hover:text-primary transition-all shadow-sm">
                       <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => onDelete(p.id)} className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-[2rem] border-2 border-red-100 dark:border-red-900/50 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                       <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
             </div>
          </div>
       </div>
       
       {/* LOWER SPECS DOCK (EXPANDED ON HOVER) */}
       <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
          {(p.specs || p.catalogSpecs) && (
             <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                <Activity className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[500px] italic">{p.specs || p.catalogSpecs}</span>
             </div>
          )}
          {p.isVirtual && (
            <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/50">
               <ExternalLink className="w-3 h-3" />
               DANE ZACIĄGNIĘTE Z UNIVERSAL CATALOG HUB V12
            </div>
          )}
       </div>
    </div>
  );
}
