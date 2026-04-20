"use client";

import { 
  Database, 
  PackageSearch, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Plus, 
  Download, 
  Printer, 
  LayoutList,
  Filter
} from "lucide-react";
import { ProductTableRow } from "./ProductTableRow";

interface IProductTableProps {
  products: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (id: string) => void;
  onSyncIQ: (id: string) => void;
  generatingId: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  categories: any[];
}

export function ProductTable({ 
  products, onEdit, onDelete, onGenerateAI, onSyncIQ, generatingId,
  currentPage, totalPages, onPageChange, pageSize, onPageSizeChange,
  categories
}: IProductTableProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
       
       {/* 1. ACTION STRIP (DHL PATTERN: SOLID BUTTONS ABOVE TABLE) */}
       <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <button className="h-10 px-6 bg-primary text-white font-black uppercase text-[11px] tracking-widest flex items-center gap-3 active-press shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Nowy Indeks
             </button>
             <button className="h-10 px-6 bg-action-yellow text-slate-900 font-black uppercase text-[11px] tracking-widest flex items-center gap-3 active-press">
                <Download className="w-4 h-4" /> Eksportuj Cennik
             </button>
             <button className="h-10 px-4 bg-white border border-slate-200 text-slate-400 hover:text-slate-950 flex items-center gap-2 active-press">
                <Printer className="w-4 h-4" />
             </button>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wyświetlaj:</span>
                {[25, 50, 100].map(size => (
                  <button 
                    key={size}
                    onClick={() => onPageSizeChange(size)}
                    className={`text-[10px] font-black ${pageSize === size ? 'text-primary' : 'text-slate-300 hover:text-slate-900'}`}
                  >
                     {size}
                  </button>
                ))}
             </div>
             <PaginationControls current={currentPage} total={totalPages} onChange={onPageChange} />
          </div>
       </div>

       {/* 2. MAIN DATA CARD (SATEL PATTERN: WHITE WORKSPACE ON GRAY) */}
       <div className="satel-card overflow-hidden bg-white">
          
          {/* INLINE FILTER HEADER (DHL PATTERN) */}
          <div className="flex items-stretch gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100">
             <div className="flex-[2] flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Produkt / Model / SKU</span>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                   <input 
                      type="text" 
                      placeholder="FILTRUJ PO NAZWIE LUB SKU..." 
                      className="w-full h-8 pl-9 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest"
                   />
                </div>
             </div>

             <div className="flex-1 hidden md:flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Producent</span>
                <select className="w-full h-8 px-2 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                   <option>WSZYSCY</option>
                   <option>SATEL</option>
                   <option>HIKVISION</option>
                   <option>DAHUA</option>
                </select>
             </div>

             <div className="flex-1 hidden lg:flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status / Stan</span>
                <select className="w-full h-8 px-2 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                   <option>DOWOLNY</option>
                   <option>DOSTĘPNY</option>
                   <option>BRAK / ZAMÓWIENIE</option>
                </select>
             </div>

             <div className="w-[124px] shrink-0" /> {/* Actions spacer */}
          </div>

          {/* DENSE LIST AREA */}
          <div className="flex flex-col min-h-[400px]">
             {products.map((p) => (
                <ProductTableRow 
                  key={p.id}
                  p={p} 
                  onEdit={onEdit} 
                  onDelete={onDelete} 
                  onGenerateAI={onGenerateAI}
                  onSyncIQ={onSyncIQ}
                  isGenerating={generatingId === p.id}
                  categories={categories}
                />
             ))}

             {products.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-center opacity-30">
                  <PackageSearch className="w-16 h-16 text-slate-200 mb-4" />
                  <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] italic">
                    Registry_Empty
                  </h4>
                  <p className="text-[10px] uppercase font-bold tracking-widest mt-2">Brak wyników spełniających kryteria filtra</p>
                </div>
             )}
          </div>
       </div>

       {/* PAGINATION INFO */}
       <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <LayoutList className="w-4 h-4" />
             Wyświetlanie <span className="text-slate-900 font-black">{products.length}</span> z <span className="text-slate-900 font-black">{totalItems(totalPages, pageSize)}</span> pozycji
          </div>
          <PaginationControls current={currentPage} total={totalPages} onChange={onPageChange} />
       </div>
    </div>
  );
}

function totalItems(total: number, size: number) {
   return total * size; // Approximation for UI feedback
}

function PaginationControls({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-100 p-1">
       <button 
         disabled={current === 1} 
         onClick={() => onChange(current - 1)} 
         className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 hover:text-slate-950 disabled:opacity-20 transition-all active-press"
       >
          <ChevronLeft className="w-4 h-4" />
       </button>
       <div className="flex items-center gap-4 px-4 font-black tabular-nums border-x border-slate-50">
          <span className="text-[11px] text-slate-950">{current}</span>
          <span className="text-[9px] text-slate-200">/</span>
          <span className="text-[11px] text-slate-400">{total}</span>
       </div>
       <button 
         disabled={current === total} 
         onClick={() => onChange(current + 1)} 
         className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 hover:text-slate-950 disabled:opacity-20 transition-all active-press"
       >
          <ChevronRight className="w-4 h-4" />
       </button>
    </div>
  );
}
