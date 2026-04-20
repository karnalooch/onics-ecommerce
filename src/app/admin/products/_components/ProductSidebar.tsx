"use client";

import { Search, Filter, Tag as TagIcon, ChevronDown, ChevronRight, Package, Library, LayoutDashboard, Database } from "lucide-react";
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
    <div className="space-y-2 sticky top-14 animate-in slide-in-from-left-2 duration-500">
       {/* MASTER SEARCH BENTO */}
       <div className="technical-panel p-3 space-y-3 bg-white">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary text-white rounded-sm flex items-center justify-center">
                <Filter className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest">Filtrowanie <span className="text-primary italic">IQ</span></h3>
            </div>
            <button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCatId(null);
                  setSelectedSubcatId(null);
                  setSelectedManufacturer("ALL");
                  setShowOnlyInStock(false);
                }}
                className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground hover:text-red-600 transition-all"
              >
                Reset
              </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-all" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Model / SKU..."
              className="w-full h-8 pl-9 pr-3 bg-secondary/20 rounded-xs border border-border outline-none focus:border-primary focus:bg-white text-[11px] font-bold uppercase tracking-tight transition-all placeholder:text-muted-foreground/30"
            />
          </div>
       </div>

       {/* STOCK STATUS TOGGLE */}
       <div className="technical-panel p-1 bg-secondary/10 grid grid-cols-2 gap-1">
          <button 
            onClick={() => setShowOnlyInStock(false)}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-wider transition-all ${!showOnlyInStock ? 'bg-white border border-border shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Library className="w-3.5 h-3.5" /> Całość
          </button>
          <button 
            onClick={() => setShowOnlyInStock(true)}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-wider transition-all ${showOnlyInStock ? 'bg-white border border-border shadow-sm text-orange-600' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Package className="w-3.5 h-3.5" /> Magazyn
          </button>
       </div>

       {/* CATEGORIES NAVIGATION */}
       <div className="technical-panel p-3 space-y-3 bg-white max-h-[calc(100vh-16rem)] flex flex-col">
          <label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em] border-b border-border pb-2 flex items-center gap-2">
            <Database className="w-3 h-3" /> Wątki Katalogowe
          </label>
          <div className="space-y-1 overflow-y-auto pr-1 horizontal-scroll-hide">
            <button 
              onClick={() => { setSelectedCatId(null); setSelectedSubcatId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xs text-[10px] font-black uppercase tracking-tighter transition-all ${!selectedCatId ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary/30'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Wszystkie
            </button>
            {categories.map(cat => (
              <div key={cat.id} className="space-y-0.5 mt-1">
                 <button 
                   onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(null); toggleCat(cat.id); }} 
                   className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-tight transition-all ${selectedCatId === cat.id && !selectedSubcatId ? 'bg-secondary text-foreground' : 'text-muted-foreground/70 hover:bg-secondary/30 hover:text-foreground'}`}
                 >
                   <span className="flex items-center gap-2 truncate"><TagIcon className="w-3 h-3 opacity-40 text-primary" /> {cat.name}</span>
                   {cat.subcategories?.length > 0 && (expandedCats.has(cat.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                 </button>
                 {expandedCats.has(cat.id) && cat.subcategories?.length > 0 && (
                   <div className="ml-5 space-y-0.5 border-l border-border pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
                     {cat.subcategories.map((sub: any) => (
                       <button 
                         key={sub.id} 
                         onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(sub.id); }} 
                         className={`w-full text-left px-2 py-1.5 rounded-xs text-[9px] font-bold transition-all uppercase tracking-tight ${selectedSubcatId === sub.id ? 'text-primary bg-primary/5' : 'text-muted-foreground/50 hover:text-foreground'}`}
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

       {/* BRANDING SELECTOR */}
       <div className="technical-panel p-3 space-y-2 bg-slate-900 text-white shadow-lg shadow-black/10">
          <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
            <Package className="w-3 h-3" /> Producent
          </label>
          <div className="relative">
            <select 
              value={selectedManufacturer} 
              onChange={e => setSelectedManufacturer(e.target.value)} 
              className="w-full h-8 px-2 bg-slate-800 rounded-xs border border-white/5 outline-none font-black text-[10px] uppercase tracking-widest text-slate-100 appearance-none cursor-pointer focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="ALL">Wszystkie marki</option>
              {manufacturersList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary pointer-events-none" />
          </div>
       </div>
    </div>
  );
}
