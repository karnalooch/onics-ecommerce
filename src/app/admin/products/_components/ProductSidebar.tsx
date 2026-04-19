// src/app/admin/products/_components/ProductSidebar.tsx
"use client";

import { Search, Filter, Layers, Tag as TagIcon, ChevronDown, ChevronRight, Package, Library, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface IProductSidebarProps {
  categories: any[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedCatId: string | null;
  setSelectedCatId: (id: string | null) => void;
  selectedSubcatId: string | null;
  setSelectedSubcatId: (id: string | null) => void;
  selectedManufacturer: string;
  setSelectedManufacturer: (m: string) => void;
  manufacturersList: string[];
  showOnlyInStock: boolean;
  setShowOnlyInStock: (v: boolean) => void;
}

export function ProductSidebar({ 
  categories, searchTerm, setSearchTerm, 
  selectedCatId, setSelectedCatId, 
  selectedSubcatId, setSelectedSubcatId,
  selectedManufacturer, setSelectedManufacturer,
  manufacturersList,
  showOnlyInStock, setShowOnlyInStock
}: IProductSidebarProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) => {
    const next = new Set(expandedCats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCats(next);
  };

  return (
    <div className="space-y-4 sticky top-12 animate-in slide-in-from-left-8 duration-1000">
       {/* MASTER SEARCH BENTO */}
       <div className="p-8 bg-white/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl space-y-8 transition-all hover:bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">
                <Filter className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Filtry <span className="text-primary italic">IQ</span></h3>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCatId(null);
                  setSelectedSubcatId(null);
                  setSelectedManufacturer("ALL");
                  setShowOnlyInStock(false);
                }}
                className="h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-900 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all"
              >
                Reset
              </Button>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Szukaj modelu..."
              className="w-full h-16 pl-14 pr-6 bg-white/40 dark:bg-slate-800/40 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black text-xs uppercase tracking-widest transition-all dark:text-white placeholder:text-slate-300 text-slate-700 dark:text-slate-100"
            />
          </div>
       </div>

       {/* STOCK STATUS BENTO */}
       <div className="p-2 bg-white/30 dark:bg-slate-950/30 backdrop-blur-2xl rounded-[2rem] border border-white/20 dark:border-slate-800/50 shadow-xl grid grid-cols-2 gap-2">
          <button 
            onClick={() => setShowOnlyInStock(false)}
            className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${!showOnlyInStock ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Library className="w-4 h-4" /> Globalna
          </button>
          <button 
            onClick={() => setShowOnlyInStock(true)}
            className={`flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${showOnlyInStock ? 'bg-orange-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Package className="w-4 h-4" /> Magazyn
          </button>
       </div>

       {/* CATEGORIES BENTO */}
       <div className="p-6 bg-white/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col gap-1 ml-2">
            <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-[0.3em] italic underline decoration-primary decoration-4 underline-offset-8">Wątki Katalogowe</label>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            <button 
              onClick={() => { setSelectedCatId(null); setSelectedSubcatId(null); }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${!selectedCatId ? 'bg-primary text-white shadow-2xl scale-[1.02]' : 'text-slate-700 dark:text-slate-300 hover:bg-primary/5'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Repozytorium All
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="space-y-1">
                 <button 
                   onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(null); toggleCat(cat.id); }} 
                   className={`w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${selectedCatId === cat.id && !selectedSubcatId ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`}
                 >
                   <span className="flex items-center gap-3 truncate"><TagIcon className="w-4 h-4" /> {cat.name}</span>
                   {cat.subcategories?.length > 0 && (expandedCats.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                 </button>
                 {expandedCats.has(cat.id) && cat.subcategories?.length > 0 && (
                   <div className="ml-10 space-y-1 border-l-4 border-primary/10 pl-4 py-2 animate-in slide-in-from-left-4 duration-500">
                     {cat.subcategories.map((sub: any) => (
                       <button 
                         key={sub.id} 
                         onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(sub.id); }} 
                         className={`w-full text-left px-4 py-3 rounded-xl text-[9px] font-black transition-all uppercase tracking-[0.1em] ${selectedSubcatId === sub.id ? 'text-primary bg-primary/5' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:translate-x-1'}`}
                       >
                         {sub.name}
                       </button>
                     ))}
                   </div>
                 )}
              </div>
            ))}
          </div>
       </div>

       {/* BRANDING BENTO */}
       <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl space-y-4 group">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] transition-colors group-hover:text-primary">Ecosystem Marek</label>
          <div className="relative">
            <select 
              value={selectedManufacturer} 
              onChange={e => setSelectedManufacturer(e.target.value)} 
              className="w-full h-14 px-6 bg-slate-800 rounded-2xl border-none outline-none font-black text-[10px] uppercase tracking-widest text-slate-100 appearance-none cursor-pointer focus:ring-2 focus:ring-primary transition-all"
            >
              <option value="ALL">Global Universe (All)</option>
              {manufacturersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
          </div>
       </div>
    </div>
  );
}
