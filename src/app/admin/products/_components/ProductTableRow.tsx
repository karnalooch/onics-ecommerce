"use client";

import { Edit2 as EditIcon, Trash2 as TrashIcon, Package as PackageIcon, Info, ChevronRight, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";

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
    <TableRow className="group/row hover:bg-slate-50 transition-colors border-b border-slate-50 select-none">
      
      {/* 1. IDENTITY BLOCK (HIGH DENSITY) */}
      <TableCell className="py-4 pl-8">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover/row:border-primary group-hover/row:scale-105 transition-all">
              {p.imageUrl ? (
                 <img src={p.imageUrl} alt={p.sku} className="w-10 h-10 object-contain p-1" />
              ) : (
                 <PackageIcon className="w-6 h-6 text-slate-100" />
              )}
           </div>
           <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                 <h3 className="text-[14px] font-black text-slate-950 truncate uppercase tracking-tighter leading-none group-hover/row:text-primary transition-colors">{p.name}</h3>
                 {p.isVirtual && <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 uppercase italic">VIRTUAL_NODE</span>}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                 <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] leading-none uppercase">{p.sku || "NO_SKU"}</span>
                 <div className="w-1 h-1 bg-slate-200 rounded-full" />
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">{category?.name || "UNCLASSIFIED"}</span>
              </div>
           </div>
        </div>
      </TableCell>

      {/* 2. MANUFACTURER (SLATE ITALIC) */}
      <TableCell className="hidden lg:table-cell py-4 px-4 text-center">
         <div className="inline-block px-3 py-1 bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-black text-slate-950 uppercase italic tracking-widest">{p.manufacturer || "GENERIC"}</span>
         </div>
      </TableCell>

      {/* 3. PRICE (TECHNICAL BOLD) */}
      <TableCell className="py-4 px-4 text-right">
         <div className="flex flex-col items-end leading-none">
            <span className="text-[15px] font-black text-slate-950 tabular-nums leading-none">{(p.price || 0).toFixed(2)}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">PLN_NETTO</span>
         </div>
      </TableCell>

      {/* 4. STOCK STATUS (OKLCH COLORS) */}
      <TableCell className="hidden md:table-cell py-4 px-4 text-right">
         <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-2 px-2 py-1 border rounded-none ${isOutofStock ? 'bg-status-error/5 border-status-error/10 text-status-error' : 'bg-primary/5 border-primary/10 text-primary'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${isOutofStock ? 'bg-status-error' : 'bg-primary animate-pulse'}`} />
               <span className="text-[10px] font-black uppercase tracking-tighter tabular-nums">{p.stock || 0} PCS</span>
            </div>
            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">STOCK_STATUS</span>
         </div>
      </TableCell>

      {/* 5. INTERACTION HUB (SATEL PILL ACTIONS) */}
      <TableCell className="py-4 pr-8 text-right w-[160px]">
         <div className="flex items-center justify-end gap-3 translate-x-4 opacity-20 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all duration-300">
            <button 
              onClick={() => onEdit(p)}
              className="h-9 px-5 bg-slate-950 text-white font-black text-[9px] uppercase tracking-widest active-press active-inset flex items-center gap-2 hover:bg-primary transition-all rounded-none"
            >
               EDYCJA <ChevronRight className="w-3 h-3" />
            </button>

            <button 
              onClick={() => onDelete(p.id)}
              className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-status-error transition-all active-press border border-slate-100 hover:border-status-error rounded-none"
              title="Delete Index"
            >
               <TrashIcon className="w-4 h-4" />
            </button>
         </div>
      </TableCell>

    </TableRow>
  );
}
