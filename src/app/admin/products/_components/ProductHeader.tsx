// src/app/admin/products/_components/ProductHeader.tsx
"use client";

import { ShoppingBag, Plus, Sparkles, Brain, ChevronDown, ChevronUp, Database, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface IProductHeaderProps {
  importing: boolean;
  onImportClick: () => void;
  onAddNew: () => void;
  onWipe?: () => void;
  isAiPanelOpen: boolean;
}

export function ProductHeader({ importing, onImportClick, onAddNew, onWipe, isAiPanelOpen }: IProductHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-16 animate-in fade-in slide-in-from-top-8 duration-1000">
       
       {/* BRANDING MONUMENT */}
       <div className="flex items-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative p-7 bg-slate-900 border-4 border-white/10 rounded-3xl shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
               <ShoppingBag className="w-12 h-12 text-primary" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 rounded-xl shadow-lg border-4 border-white dark:border-slate-900">
               <Zap className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          
          <div className="space-y-1">
             <div className="flex items-center gap-4">
                <h1 className="text-6xl font-black tracking-[-0.05em] uppercase italic leading-none dark:text-white">
                  Baza <span className="text-primary NOT-italic opacity-90 tracking-tighter">Produktów</span>
                </h1>
             </div>
             <div className="flex items-center gap-3 mt-2 ml-1">
                <Database className="w-4 h-4 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Central Registry & Intelligence Hub V12</p>
             </div>
          </div>
       </div>
       
       {/* MASTER ACTIONS DOCK */}
       <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
          
          {/* NEURAL INTELLIGENCE PORTAL */}
          <button 
             onClick={onImportClick}
             className={`h-20 px-10 rounded-2xl transition-all duration-700 flex items-center gap-5 border-2 shadow-2xl relative overflow-hidden group
               ${isAiPanelOpen 
                  ? 'bg-slate-900 text-white border-primary shadow-primary/20 scale-[0.98]' 
                  : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border-white dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-primary/50'
               }`}
          >
             <div className="relative z-10">
                <div className={`p-3 rounded-2xl transition-all duration-500 ${isAiPanelOpen ? 'bg-primary text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10'}`}>
                   <Brain className={`w-6 h-6 ${isAiPanelOpen && 'animate-pulse'}`} />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-orange-500 animate-bounce opacity-0 group-hover:opacity-100" />
             </div>
             
             <div className="flex flex-col items-start leading-none gap-2 z-10">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 italic">Intelligence System</span>
                <span className="text-sm font-black uppercase tracking-widest">{isAiPanelOpen ? 'Neural Hub Active' : 'Uruchom Analizę AI'}</span>
             </div>
             
             {isAiPanelOpen ? <ChevronUp className="w-5 h-5 ml-4 text-primary" /> : <ChevronDown className="w-5 h-5 ml-4 opacity-30" />}
             
             {/* BACKGROUND DECORATIVE FX */}
             {isAiPanelOpen && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
          </button>

          <div className="h-12 w-[2px] bg-slate-100 dark:bg-slate-800 hidden md:block" />

          {/* SECONDARY OPERATIONS */}
          <div className="flex gap-4">
             <Button 
                onClick={onWipe}
                variant="ghost"
                className="h-20 px-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-black uppercase text-[10px] tracking-[0.2em] gap-4"
             >
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline">Hard Reset</span>
             </Button>

             <Button 
                onClick={onAddNew}
                className="h-20 px-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-[0.15em] shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-primary hover:text-white dark:hover:bg-primary transition-all gap-5 text-xs group relative overflow-hidden"
             >
                <div className="relative z-10 flex items-center gap-4">
                   <div className="p-2.5 bg-white/10 dark:bg-slate-900/10 rounded-xl group-hover:rotate-180 transition-transform duration-700">
                      <Plus className="w-6 h-6" />
                   </div>
                   <span>Dodaj do bazy</span>
                </div>
                {/* BUTTON SHINE EFFECT */}
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-full transition-all duration-1000" />
             </Button>
          </div>
       </div>
    </div>
  );
}
