"use client";

import { Trash2 as TrashIcon, Package as PackageIcon } from "lucide-react";
import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";

interface IProductTableRowProps {
  p: any;
  onDelete: (id: string) => void;
  categories: any[];
}

export function ProductTableRow({ p, onDelete, categories }: IProductTableRowProps) {
  const category = categories.find(c => c.id === p.categoryId);
  const isOutofStock = p.stock <= 0;

  return (
    <TableRow className="group/row hover:bg-black/5 dark:hover:bg-white/5 transition-all border-b border-black/5 dark:border-white/10 select-none">
      
      {/* 1. IDENTITY BLOCK (FLUENT) */}
      <TableCell className="py-5 pl-8">
        <div className="flex items-center gap-5">
           <div className="w-12 h-12 bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center shrink-0 rounded-lg group-hover/row:scale-105 transition-all shadow-sm">
              {p.imageUrl ? (
                 <img src={p.imageUrl} alt={p.sku} className="w-10 h-10 object-contain p-1" />
              ) : (
                 <PackageIcon className="w-6 h-6 text-muted-foreground/30" />
              )}
           </div>
           <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                 <h3 className="text-[14px] font-bold text-foreground truncate tracking-tight group-hover/row:text-primary transition-colors">{p.name}</h3>
                 {p.isVirtual && <span className="text-[9px] font-bold px-2 py-0.5 bg-black/5 dark:bg-white/10 text-muted-foreground rounded uppercase italic">Virtual</span>}
              </div>
              <div className="flex items-center gap-3 mt-1">
                 <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase opacity-60">{p.sku || "N/A"}</span>
                 <div className="w-1 h-1 bg-black/10 dark:bg-white/10 rounded-full" />
                 <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">{category?.name || "Kategoria"}</span>
              </div>
           </div>
        </div>
      </TableCell>

      {/* 2. MANUFACTURER (FLUENT BADGE) */}
      <TableCell className="hidden lg:table-cell py-5 px-4 text-center">
         <div className="inline-block px-4 py-1 bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-md">
            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{p.manufacturer || "General"}</span>
         </div>
      </TableCell>

      {/* 3. PRICE (BOLD TYPOGRAPHY) */}
      <TableCell className="py-5 px-4 text-right">
         <div className="flex flex-col items-end leading-none">
            <span className="text-[16px] font-extrabold text-foreground tabular-nums">{(p.price || 0).toFixed(2)}</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">PLN</span>
         </div>
      </TableCell>

      {/* 4. STOCK STATUS (FLUENT PILL) */}
      <TableCell className="hidden md:table-cell py-5 px-4 text-right">
         <div className="flex flex-col items-end gap-1">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-pill border ${isOutofStock ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${isOutofStock ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
               <span className="text-[11px] font-bold tabular-nums">{p.stock || 0} SZT</span>
            </div>
         </div>
      </TableCell>

      {/* 5. INTERACTION HUB (FLUENT GHOST ACTIONS) */}
      <TableCell className="py-5 pr-8 text-right w-[160px]">
         <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
            {!p.isVirtual ? (
              <>
                <Link
                  href={`/admin/products/${encodeURIComponent(p.id)}`}
                  className="h-9 px-4 bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider rounded-lg hover:bg-primary hover:text-white transition-all active-press flex items-center gap-2"
                >
                  Edytuj
                </Link>
                <button 
                  onClick={() => onDelete(p.id)}
                  className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all active-press"
                  title="Usuń produkt"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Tylko baza wiedzy
              </span>
            )}
         </div>
      </TableCell>

    </TableRow>
  );
}
