// src/app/admin/products/_components/ProductTable.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Database, PackageSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductTableRow } from "./ProductTableRow";
import { Button } from "@/components/ui/button";

interface IProductTableProps {
  products: any[];
  onEdit: (p: any) => void;
  onDelete: (id: string) => void;
  onGenerateAI: (id: string) => void;
  generatingId: string | null;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export function ProductTable({ 
  products, onEdit, onDelete, onGenerateAI, generatingId,
  currentPage, totalPages, onPageChange, pageSize, onPageSizeChange
}: IProductTableProps) {
  return (
    <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
       <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-2xl">
                <Database className="w-5 h-5 text-primary" />
             </div>
             <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Ewidencja <span className="text-primary italic">Towarowa</span></CardTitle>
                <div className="flex items-center gap-4 mt-1">
                   {[10, 20, 50].map(size => (
                     <button key={size} onClick={() => onPageSizeChange(size)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${pageSize === size ? 'text-primary underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-slate-600'}`}>
                        {size} / STR
                     </button>
                   ))}
                </div>
             </div>
          </div>
          
          <PaginationControls 
            current={currentPage} 
            total={totalPages} 
            onChange={onPageChange} 
          />
       </div>

       <CardContent className="p-0">
          <div className="min-h-[600px] overflow-x-auto">
             <Table>
                <TableHeader className="bg-slate-100/50">
                   <TableRow className="hover:bg-transparent">
                      <TableHead className="py-6 pl-10 font-black uppercase text-[10px] tracking-widest">Produkt / SKU</TableHead>
                      <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Cena Netto</TableHead>
                      <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Stan</TableHead>
                      <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest text-center">AI SEO</TableHead>
                      <TableHead className="py-6 text-right pr-10 font-black uppercase text-[10px] tracking-widest">Zarządzaj</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {products.map(p => (
                      <ProductTableRow 
                         key={p.id} 
                         p={p} 
                         onEdit={onEdit} 
                         onDelete={onDelete} 
                         onGenerateAI={onGenerateAI}
                         isGenerating={generatingId === p.id}
                      />
                   ))}
                   {products.length === 0 && (
                      <TableRow>
                         <TableCell colSpan={5} className="py-40 text-center">
                            <PackageSearch className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                            <h4 className="text-xl font-black text-slate-200 uppercase italic">Brak wyników w tej sekcji</h4>
                         </TableCell>
                      </TableRow>
                   )}
                </TableBody>
             </Table>
          </div>
       </CardContent>
    </Card>
  );
}

function PaginationControls({ current, total, onChange }: { current: number, total: number, onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
       <Button variant="ghost" size="icon" disabled={current === 1} onClick={() => onChange(current - 1)} className="w-10 h-10 rounded-xl disabled:opacity-20">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
       </Button>
       <div className="px-4 flex items-center gap-2">
          <span className="text-sm font-black text-slate-900">{current}</span>
          <span className="text-slate-300 font-bold">/</span>
          <span className="text-xs font-bold text-slate-400">{total}</span>
       </div>
       <Button variant="ghost" size="icon" disabled={current === total} onClick={() => onChange(current + 1)} className="w-10 h-10 rounded-xl disabled:opacity-20">
          <ChevronRight className="w-5 h-5 text-slate-600" />
       </Button>
    </div>
  );
}
