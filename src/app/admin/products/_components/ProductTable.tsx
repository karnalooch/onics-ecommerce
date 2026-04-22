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
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";

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
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 select-none">
       
       {/* 1. OPERATIONAL ACTION STRIP */}
       <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <button className="h-10 px-6 bg-primary text-white font-bold text-[12px] flex items-center gap-3 active-press rounded-lg shadow-lg shadow-primary/20 transition-all hover:brightness-110">
                <Plus className="w-4 h-4" /> DODAJ PRODUKT
             </button>
             <button className="h-10 px-6 bg-card border border-black/5 dark:border-white/10 text-foreground font-bold text-[12px] flex items-center gap-3 active-press hover:bg-black/5 dark:hover:bg-white/5 transition-all rounded-lg">
                <Download className="w-4 h-4" /> EKSPORT XLS
             </button>
             <button className="h-10 px-6 bg-card border border-black/5 dark:border-white/10 text-muted-foreground font-bold text-[12px] flex items-center gap-3 active-press hover:text-foreground transition-all rounded-lg">
                <Printer className="w-4 h-4" /> ETYKIETY
             </button>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4 pr-6 border-r border-black/5 dark:border-white/10">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Wierszy:</span>
                <div className="flex gap-1">
                   {[25, 50, 100].map(size => (
                     <button 
                       key={size}
                       onClick={() => onPageSizeChange(size)}
                       className={`h-8 px-4 text-[11px] font-bold border transition-all rounded-md active-press ${
                         pageSize === size 
                           ? 'bg-primary text-white border-primary shadow-md' 
                           : 'bg-card text-muted-foreground border-black/5 dark:border-white/10 hover:text-foreground'
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

       {/* 2. DATA GRID (FLUENT STYLE) */}
       <div className="fluent-card shadow-2xl border-white/20 overflow-hidden">
          <Table>
             <TableHeader className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10">
                <TableRow className="hover:bg-transparent border-none">
                   {/* MODEL / NAME COLUMN */}
                   <TableHead className="py-5 pl-8 min-w-[320px]">
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Model / Nazwa</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                         </div>
                         <div className="relative group max-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input 
                               type="text" 
                               placeholder="Szukaj..." 
                               className="w-full h-8 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[12px] font-medium rounded-md pl-9 pr-3 outline-none focus:bg-white dark:focus:bg-black/20 focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                         </div>
                      </div>
                   </TableHead>

                   {/* PRODUCER COLUMN */}
                   <TableHead className="hidden lg:table-cell py-5 px-4 min-w-[160px]">
                      <div className="flex flex-col gap-2">
                         <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Producent</span>
                         <select className="w-full h-8 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[12px] font-medium rounded-md px-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                            <option>-- Wszyscy --</option>
                            <option>SATEL</option>
                            <option>HIKVISION</option>
                            <option>DAHUA</option>
                         </select>
                      </div>
                   </TableHead>

                   {/* PRICE COLUMN */}
                   <TableHead className="py-5 px-4 text-right min-w-[140px]">
                      <div className="flex flex-col gap-2 items-end">
                         <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Cena Netto</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
                         </div>
                         <div className="text-[10px] font-bold text-muted-foreground italic uppercase opacity-50">Sortowanie</div>
                      </div>
                   </TableHead>

                   {/* STATUS COLUMN */}
                   <TableHead className="hidden md:table-cell py-5 px-4 text-right min-w-[140px]">
                      <div className="flex flex-col gap-2 items-end">
                         <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Dostępność</span>
                         <div className="flex gap-1 h-8 items-center bg-black/5 dark:bg-white/5 p-1 rounded-md">
                            {['ALL', 'STOCK'].map(f => (
                               <button 
                                 key={f}
                                 className={`px-3 h-6 text-[9px] font-bold uppercase rounded transition-all ${
                                    f === 'ALL' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-muted-foreground'
                                 }`}
                               >
                                  {f}
                               </button>
                            ))}
                         </div>
                      </div>
                   </TableHead>

                   {/* ACTIONS COLUMN */}
                   <TableHead className="py-5 pr-8 text-right w-[160px]">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Akcje</span>
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
                        <div className="flex flex-col items-center justify-center text-center opacity-40">
                           <PackageSearch className="w-12 h-12 text-muted-foreground mb-4" />
                           <h4 className="text-[14px] font-bold text-foreground uppercase italic mb-1">
                              Brak wyników
                           </h4>
                           <p className="text-[11px] font-medium text-muted-foreground">Spróbuj zmienić parametry wyszukiwania</p>
                        </div>
                     </TableCell>
                  </TableRow>
                )}
             </TableBody>
          </Table>
       </div>

       {/* 3. STATUS BAR */}
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground uppercase italic underline-offset-4">
             <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/30" />
             Status: <span className="text-foreground">Synchronized_OK</span>
             <span className="opacity-20 px-2">|</span>
             Total: <span className="text-foreground tracking-widest">{products.length}</span>
          </div>
          <PaginationControls current={currentPage} total={totalPages} onChange={onPageChange} />
       </div>
    </div>
  );
}

function PaginationControls({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1 bg-card border border-black/5 dark:border-white/10 p-1 rounded-xl shadow-lg">
       <button 
         disabled={current === 1} 
         onClick={() => onChange(current - 1)} 
         className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all active-press"
       >
          <ChevronLeft className="w-5 h-5" />
       </button>
       
       <div className="flex items-center gap-6 px-8 font-bold tabular-nums border-x border-black/5 dark:border-white/10 h-10">
          <div className="flex flex-col items-center leading-none">
             <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Strona</span>
             <span className="text-[13px] text-foreground">{current}</span>
          </div>
          <div className="w-px h-6 bg-black/5 dark:bg-white/10" />
          <div className="flex flex-col items-center leading-none">
             <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Z</span>
             <span className="text-[13px] text-muted-foreground">{total}</span>
          </div>
       </div>

       <button 
         disabled={current === total} 
         onClick={() => onChange(current + 1)} 
         className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all active-press"
       >
          <ChevronRight className="w-5 h-5" />
       </button>
    </div>
  );
}
