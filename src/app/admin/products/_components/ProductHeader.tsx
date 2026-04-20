// src/app/admin/products/_components/ProductHeader.tsx
"use client";

import { ShoppingBag, Plus, Sparkles, Brain, Database, Trash2, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IProductHeaderProps {
  onImportClick: () => void;
  onAddNew: () => void;
  onWipe?: () => void;
  onPriceListClick: () => void;
  isAiView?: boolean;
}

export function ProductHeader({ onImportClick, onAddNew, onWipe, onPriceListClick, isAiView }: IProductHeaderProps) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      {/* COMPACT TECHNICAL TOOLBAR - V4 MISSION CONTROL */}
      <div className="flat-panel p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white">
        
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-sm shadow-inner shrink-0">
             <ShoppingBag className="w-6 h-6" />
          </div>
          
          <div className="space-y-0.5">
             <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
                  Centralny Rejestr <span className="text-primary NOT-italic">Towarowy</span>
                </h1>
                <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-xs">
                   <span className="text-[8px] font-black uppercase text-primary tracking-widest">CRT v4.6_PRO</span>
                </div>
             </div>
             <div className="flex items-center gap-2 opacity-40">
                <Database className="w-3 h-3" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] italic">Systemowy Węzeł Ewidencji i Inteligencji Satelitarnej</p>
             </div>
          </div>
        </div>

        {/* PRIMARY ACTIONS HUB */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
           {/* RESTORED: GENERATOR CENNIKÓW */}
           <button 
              onClick={onPriceListClick}
              className="h-10 px-6 bg-secondary/50 border border-border hover:border-primary/40 hover:bg-white text-foreground transition-all duration-snap ease-snap rounded-sm flex items-center gap-3 group"
           >
              <Tag className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="flex flex-col items-start leading-none">
                 <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Narzędzia</span>
                 <span className="text-[10px] font-black uppercase tracking-tight">Generator Cenników</span>
              </div>
           </button>

           <div className="h-6 w-[1px] bg-border mx-1 hidden xl:block" />

           {/* AI HUB TRIGGER */}
           <button 
              onClick={onImportClick}
              className={`h-10 px-6 border transition-all duration-snap ease-snap rounded-sm flex items-center gap-3 group ${isAiView ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-border hover:border-primary/50 text-foreground'}`}
           >
              <Brain className={`w-4 h-4 ${isAiView ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <div className="flex flex-col items-start leading-none text-left">
                 <span className="text-[8px] font-black uppercase tracking-widest opacity-40 italic">Biurko</span>
                 <span className="text-[10px] font-black uppercase tracking-tight">{isAiView ? 'Węzeł Aktywny' : 'Weryfikacja Importu'}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isAiView ? 'rotate-90' : 'opacity-20'}`} />
           </button>

           {/* ADD NEW PRODUCT */}
           <Button 
              onClick={onAddNew}
              className="h-10 px-8 bg-primary text-white font-black uppercase text-[10px] tracking-[0.1em] rounded-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-4"
           >
              <Plus className="w-4 h-4" />
              <span>Dodaj Produkt</span>
           </Button>

           {/* DANGER AREA (RESET) */}
           <button 
              onClick={onWipe}
              className="w-10 h-10 flex items-center justify-center rounded-sm border border-border hover:border-red-500/30 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all"
              title="CZYŚĆ REJESTR"
           >
              <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
}

