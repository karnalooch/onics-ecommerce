"use client";

import { Edit2 as EditIcon, Trash2 as TrashIcon, Package as PackageIcon, Info, ChevronRight, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import Link from "next/link";

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
  
  const isOutofStock = p.stock <= 0;

  return (
    <div className="group/row flex items-center gap-4 py-4 px-6 bg-white border-b border-slate-50 transition-all hover:bg-slate-50/80 active-press select-none">
      
      {/* 1. IDENTITY BLOCK (HIGH DENSITY) */}
      <div className="flex-[2] min-w-0 flex items-center gap-4">
         <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover/row:border-primary transition-colors">
            {p.imageUrl ? (
               <img src={p.imageUrl} alt={p.sku} className="w-10 h-10 object-contain" />
            ) : (
               <PackageIcon className="w-6 h-6 text-slate-200" />
            )}
         </div>
         <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
               <h3 className="text-[13px] font-black text-slate-900 truncate uppercase tracking-tighter">{p.name}</h3>
               {p.isVirtual && <span className="text-[9px] font-black px-1.5 bg-slate-950 text-white uppercase italic">VIRTUAL</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-black text-slate-400 tracking-widest">{p.sku}</span>
               <span className="text-[10px] font-bold text-primary opacity-50 uppercase tracking-tighter italic">· {p.manufacturer || "MANUFACTURER_ID"}</span>
            </div>
         </div>
      </div>

      {/* 2. AUTO-EXPANDABLE DATA COLUMNS (DHL/SATEL PATTERN) */}
      <div className="flex-1 hidden md:flex flex-col items-end">
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kategoria</span>
         <span className="text-[11px] font-bold text-slate-950 truncate max-w-[120px]">{category?.name || "Uncategorized"}</span>
      </div>

      <div className="flex-1 flex flex-col items-end min-w-[100px]">
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena Netto</span>
         <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-950 tabular-nums">{(p.price || 0).toFixed(2)}</span>
            <span className="text-[10px] font-bold text-slate-400">PLN</span>
         </div>
      </div>

      {/* 3. STOCK STATUS (WORKFLOW LABEL) */}
      <div className="flex-1 hidden lg:flex flex-col items-end">
         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dostępność</span>
         <div className={`px-2 py-0.5 mt-0.5 flex items-center gap-1.5 border ${isOutofStock ? 'bg-red-50 border-red-100 text-status-error' : 'bg-green-50 border-green-100 text-status-success'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isOutofStock ? 'bg-status-error' : 'bg-status-success shadow-[0_0_8px_oklch(60%_0.12_150)]'}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{p.stock} SZT</span>
         </div>
      </div>

      {/* 4. INTERACTION HUB (SATEL PILL ACTIONS) */}
      <div className="flex items-center gap-2 pl-4">
         <button 
           onClick={() => onEdit(p)}
           className="pill-action bg-action-blue text-white hover:bg-primary hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2 group/btn"
         >
            Szczegóły <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
         </button>

         <button 
           onClick={() => onDelete(p.id)}
           className="w-9 h-9 flex items-center justify-center text-slate-200 hover:text-red-600 hover:bg-red-50 transition-all rounded-sm"
           title="Usuń"
         >
            <TrashIcon className="w-4 h-4" />
         </button>
      </div>

    </div>
  );
}
