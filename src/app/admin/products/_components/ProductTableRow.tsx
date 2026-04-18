// src/app/admin/products/_components/ProductTableRow.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Sparkles } from "lucide-react";

interface IProductTableRowProps {
  p: any;
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (id: string) => void;
  isGenerating: boolean;
}

export function ProductTableRow({ p, onEdit, onDelete, onGenerateAI, isGenerating }: IProductTableRowProps) {
  return (
    <tr className="group hover:bg-slate-50 transition-all duration-300 border-b border-slate-100 last:border-0">
       <td className="py-6 pl-10">
          <div className="flex flex-col">
             <span className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1 truncate max-w-[300px]">{p.name}</span>
             <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[9px] font-black tracking-widest bg-slate-100/50 border-slate-200">{p.sku}</Badge>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.manufacturer}</span>
             </div>
          </div>
       </td>
       <td className="py-6">
          <div className="flex flex-col">
             <span className={`text-xl font-black ${p.price > 0 ? 'text-slate-900' : 'text-slate-300 italic'}`}>
                {p.price > 0 ? `${p.price.toFixed(2)} PLN` : 'Cena na zapytanie'}
             </span>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cena Netto</span>
          </div>
       </td>
       <td className="py-6">
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${p.stock > 10 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : p.stock > 0 ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-red-500 shadow-lg shadow-red-500/20'}`}></div>
             <span className={`text-sm font-black ${p.stock > 0 ? 'text-slate-700' : 'text-red-400'}`}>
                {p.stock} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Szt.</span>
             </span>
          </div>
       </td>
       <td className="py-6">
          <div className="flex flex-col items-center">
             <button onClick={() => onGenerateAI(p.id)} disabled={isGenerating} className={`p-2 rounded-xl transition-all ${p.seoDescription ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5'}`} title="Generuj opis AI">
               {isGenerating ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : <Sparkles className="w-4 h-4" />}
             </button>
             {p.seoDescription && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1">SEO OK</span>}
          </div>
       </td>
       <td className="py-6 text-right pr-10">
          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
             <button onClick={() => onEdit(p)} className="btn-action-blue !w-10 !h-10 !rounded-2xl" title="Edytuj produkt">
                <Edit2 className="h-5 w-5" />
             </button>
             <button onClick={() => onDelete(p.id)} className="btn-action-red !w-10 !h-10 !rounded-2xl" title="Usuń produkt">
                <Trash2 className="h-5 w-5" />
             </button>
          </div>
       </td>
    </tr>
  );
}
