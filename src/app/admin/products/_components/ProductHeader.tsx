// src/app/admin/products/_components/ProductHeader.tsx
"use client";

import { ShoppingBag, UploadCloud, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IProductHeaderProps {
  importing: boolean;
  onImportClick: () => void;
  onAddNew: () => void;
}

export function ProductHeader({ importing, onImportClick, onAddNew }: IProductHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
       <div className="space-y-2">
         <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <ShoppingBag className="w-10 h-10 text-primary" /> Baza <span className="text-primary italic uppercase tracking-tighter">Produktów</span>
         </h1>
         <p className="text-slate-500 font-medium max-w-xl">
           Zarządzaj centralną bazą towarową Celtronics. Automatyczny import z WF-Mag i wsparcie AI.
         </p>
       </div>
       
       <div className="flex gap-4">
         <Button 
            onClick={onImportClick}
            disabled={importing}
            variant="outline"
            className="h-14 px-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-primary/30 font-bold shadow-sm transition-all gap-3"
         >
            <UploadCloud className="w-5 h-5 text-primary" />
            {importing ? "Przetwarzanie..." : "Importuj WF-Mag"}
         </Button>
         <Button 
            onClick={onAddNew}
            className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all gap-3 text-xs"
         >
            <Plus className="w-5 h-5" />
            Dodaj Nowy
         </Button>
       </div>
    </div>
  );
}
