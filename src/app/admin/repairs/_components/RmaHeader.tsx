// src/app/admin/repairs/_components/RmaHeader.tsx
"use client";

import { Search, Wrench, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IHeaderProps {
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  isAdding: boolean;
  setIsAdding: (b: boolean) => void;
}

export function RmaHeader({ searchQuery, setSearchQuery, isAdding, setIsAdding }: IHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
      <div>
        <h2 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
           <Wrench className="w-10 h-10 text-primary" /> Centrum <span className="text-primary italic tracking-tighter uppercase">RMA</span>
        </h2>
        <p className="text-muted-foreground font-medium mt-2">
          Centralny panel zarządzania serwisem i gwarancjami Celtronics B2B.
        </p>
      </div>
      <div className="flex items-center gap-4">
         <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Szukaj RMA / Klienta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-6 py-3.5 bg-card border border-border rounded-2xl w-64 md:w-80 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm shadow-sm"
            />
         </div>
         <Button 
           onClick={() => setIsAdding(!isAdding)} 
           size="lg"
           className={`rounded-2xl px-6 py-6 h-auto font-black uppercase tracking-widest gap-3 shadow-lg shadow-primary/20 transition-all ${isAdding ? 'bg-slate-900 border-slate-800' : ''}`}
         >
           {isAdding ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
           {isAdding ? "Anuluj" : "Zgłoś RMA"}
         </Button>
      </div>
    </div>
  );
}
