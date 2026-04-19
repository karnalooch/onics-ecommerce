"use client";

import { Database, PackageSearch, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductTableRow } from "./ProductTableRow";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ProductGridV12 } from "./ProductGridV12";

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
       {/* PREMIUM HEADER CONTROLS */}
       <div className="p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
             <div className="p-5 bg-primary text-white rounded-[1.5rem] shadow-xl shadow-primary/20 rotate-3">
                <Database className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Ewidencja <span className="text-primary italic">Towarowa</span></h2>
                <div className="flex items-center gap-6 mt-2">
                   {[10, 20, 50].map(size => (
                     <button 
                       key={size} 
                       onClick={() => onPageSizeChange(size)} 
                       className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center group ${pageSize === size ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        {size} / STR
                        <div className={`h-[2px] bg-primary transition-all duration-300 mt-1 ${pageSize === size ? 'w-full' : 'w-0 group-hover:w-1/2'}`} />
                     </button>
                   ))}
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
               <button 
                 onClick={() => setViewMode("list")}
                 className={`p-2 rounded-lg transition-all ${viewMode === "list" ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <ListIcon className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode("grid")}
                 className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
            </div>
            
            <PaginationControls 
              current={currentPage} 
              total={totalPages} 
              onChange={onPageChange} 
            />
          </div>
       </div>

       {/* MODULAR BENTO CARDS CONTAINER */}
       <div className="space-y-4">
          <AnimatePresence mode="wait">
            {viewMode === "list" ? (
              <div key="list" className="grid gap-3">
                {products.map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProductTableRow 
                      p={p} 
                      onEdit={onEdit} 
                      onDelete={onDelete} 
                      onGenerateAI={onGenerateAI}
                      onSyncIQ={onSyncIQ}
                      isGenerating={generatingId === p.id}
                      categories={categories}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div key="grid">
                <ProductGridV12 products={products} categories={categories} />
              </div>
            )}
          </AnimatePresence>

          {products.length === 0 && (
            <div className="py-40 bg-white/20 dark:bg-slate-900/20 backdrop-blur-xl rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <PackageSearch className="w-24 h-24 text-slate-200 dark:text-slate-800 mb-6 animate-bounce" />
              <h4 className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase italic">Gisatantyczny Brak Wyników</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4">System gotowy do importu nowych danych</p>
            </div>
          )}
       </div>

       {/* BOTTOM PAGINATION */}
       {totalPages > 1 && (
         <div className="flex justify-center pt-8">
            <PaginationControls 
              current={currentPage} 
              total={totalPages} 
              onChange={onPageChange} 
            />
         </div>
       )}
    </div>
  );
}

function PaginationControls({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl px-6 py-2 rounded-full border border-white dark:border-slate-800 shadow-xl">
       <Button 
         variant="ghost" 
         size="icon" 
         disabled={current === 1} 
         onClick={() => onChange(current - 1)} 
         className="w-10 h-10 rounded-full hover:bg-primary hover:text-white transition-all disabled:opacity-20"
       >
          <ChevronLeft className="w-5 h-5" />
       </Button>
       <div className="flex items-center gap-4 px-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">{current}</span>
          <div className="h-4 w-[2px] bg-slate-200" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{total}</span>
       </div>
       <Button 
         variant="ghost" 
         size="icon" 
         disabled={current === total} 
         onClick={() => onChange(current + 1)} 
         className="w-10 h-10 rounded-full hover:bg-primary hover:text-white transition-all disabled:opacity-20"
       >
          <ChevronRight className="w-5 h-5" />
       </Button>
    </div>
  );
}
