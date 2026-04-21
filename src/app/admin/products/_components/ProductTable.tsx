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
  Filter,
  ArrowUpDown
} from "lucide-react";
import { ProductTableRow } from "./ProductTableRow";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 select-none">
       
       {/* 1. OPERATIONAL ACTION STRIP */}
       <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <button className="h-10 px-6 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-3 active-press rounded-none transition-transform">
                <Plus className="w-4 h-4 text-primary" /> DODAJ_INDUKS
             </button>
             <button className="h-10 px-6 bg-white border border-slate-200 text-slate-950 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 active-press hover:bg-slate-50 transition-all rounded-none">
                <Download className="w-4 h-4" /> EKSPORT_XLS
             </button>
             <button className="h-10 px-6 bg-white border border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 active-press hover:text-slate-950 transition-all rounded-none">
                <Printer className="w-4 h-4" /> DRUKUJ_ETYKIETY
             </button>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 pr-6 border-r border-slate-100">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic leading-none">Rows_Per_Node:</span>
                <div className="flex gap-2">
                   {[25, 50, 100].map(size => (
                     <button 
                       key={size}
                       onClick={() => onPageSizeChange(size)}
                       className={`h-7 px-3 text-[10px] font-black border transition-all active-press ${
                         pageSize === size 
                           ? 'bg-slate-950 text-white border-slate-950' 
                           : 'bg-white text-slate-400 border-slate-200 hover:text-slate-900'
                       }`}
                     >
                        {size}
                     </button>
                   ))}
                </div>
             </div>
             <PaginationControls current={currentPage} total={totalPages} onChange={onPageChange} />
          </div>
       </div>

       {/* 2. PIM DATA GRID (INLINE FILTERS MANDATE) */}
       <div className="satel-card bg-white shadow-sm border-none no-blur overflow-hidden">
          <Table>
             <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                   {/* MODEL / NAME COLUMN */}
                   <TableHead className="py-4 pl-8 min-w-[320px]">
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Indeks / Model / Nazwa</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-200 cursor-pointer hover:text-primary transition-colors" />
                         </div>
                         <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <input 
                               type="text" 
                               placeholder="SZUKAJ_FRAZY..." 
                               className="w-full h-9 bg-white border border-slate-100 text-[11px] font-bold uppercase tracking-widest pl-9 pr-3 outline-none focus:border-primary transition-all shadow-sm"
                            />
                         </div>
                      </div>
                   </TableHead>

                   {/* PRODUCER COLUMN */}
                   <TableHead className="hidden lg:table-cell py-4 px-4 min-w-[160px]">
                      <div className="flex flex-col gap-2">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Producent</span>
                         <select className="w-full h-9 bg-white border border-slate-100 text-[10px] font-bold uppercase tracking-widest px-3 outline-none focus:border-primary transition-all shadow-sm appearance-none cursor-pointer">
                            <option>-- WSZYSCY --</option>
                            <option>SATEL</option>
                            <option>HIKVISION</option>
                            <option>DAHUA</option>
                            <option>BCS</option>
                         </select>
                      </div>
                   </TableHead>

                   {/* PRICE COLUMN */}
                   <TableHead className="py-4 px-4 text-right min-w-[140px]">
                      <div className="flex flex-col gap-2 items-end">
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cena_Netto</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-200 cursor-pointer hover:text-primary transition-colors" />
                         </div>
                         <div className="h-9 w-full flex items-center justify-end px-3 bg-slate-50/50 border border-transparent text-[9px] font-black text-slate-300 italic tracking-widest">SORT_RECORDS</div>
                      </div>
                   </TableHead>

                   {/* STATUS COLUMN */}
                   <TableHead className="hidden md:table-cell py-4 px-4 text-right min-w-[140px]">
                      <div className="flex flex-col gap-2 items-end">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Dostępność</span>
                         <div className="flex gap-1 h-9 items-center">
                            {['ALL', 'STOCK'].map(f => (
                               <button 
                                 key={f}
                                 className={`px-3 h-7 text-[8px] font-black uppercase tracking-widest border transition-all ${
                                    f === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                                 }`}
                               >
                                  {f}
                               </button>
                            ))}
                         </div>
                      </div>
                   </TableHead>

                   {/* ACTIONS COLUMN */}
                   <TableHead className="py-4 pr-8 text-right w-[160px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Zarządzanie</span>
                   </TableHead>
                </TableRow>
             </TableHeader>

             <TableBody>
                {products.length > 0 ? (
                  products.map((p) => (
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
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={5} className="py-32">
                        <div className="flex flex-col items-center justify-center text-center opacity-30">
                           <PackageSearch className="w-12 h-12 text-slate-200 mb-4" />
                           <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.4em] italic mb-1">
                              REGISTRY_EMPTY
                           </h4>
                           <p className="text-[9px] uppercase font-bold tracking-widest">Brak rekordów dopasowanych do filtrów</p>
                        </div>
                     </TableCell>
                  </TableRow>
                )}
             </TableBody>
          </Table>
       </div>

       {/* 3. LOG FOOTER */}
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest italic outline-none">
             <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
             NODE_STATUS: <span className="text-slate-950">RECORDS_INDEXED_OK</span>
             <span className="text-slate-100 select-none px-2 font-light">/</span>
             TOTAL_COUNT: <span className="text-slate-950">{products.length}</span>
          </div>
          <PaginationControls current={currentPage} total={totalPages} onChange={onPageChange} />
       </div>
    </div>
  );
}

function PaginationControls({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1 bg-white border border-slate-100 p-1">
       <button 
         disabled={current === 1} 
         onClick={() => onChange(current - 1)} 
         className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-slate-950 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all active-press border border-transparent hover:border-slate-100"
       >
          <ChevronLeft className="w-4 h-4" />
       </button>
       
       <div className="flex items-center gap-6 px-8 font-black tabular-nums border-x border-slate-50 h-10">
          <div className="flex flex-col items-center leading-none">
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Page</span>
             <span className="text-[12px] text-slate-950 leading-none">{current}</span>
          </div>
          <div className="w-px h-6 bg-slate-100" />
          <div className="flex flex-col items-center leading-none">
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Total</span>
             <span className="text-[12px] text-slate-400 leading-none">{total}</span>
          </div>
       </div>

       <button 
         disabled={current === total} 
         onClick={() => onChange(current + 1)} 
         className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-slate-950 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all active-press border border-transparent hover:border-slate-100"
       >
          <ChevronRight className="w-4 h-4" />
       </button>
    </div>
  );
}
