// src/app/admin/products/_components/ProductSidebar.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, Filter, Layers, Tag as TagIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

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
}

export function ProductSidebar({ 
  categories, searchTerm, setSearchTerm, 
  selectedCatId, setSelectedCatId, 
  selectedSubcatId, setSelectedSubcatId,
  selectedManufacturer, setSelectedManufacturer,
  manufacturersList
}: IProductSidebarProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) => {
    const next = new Set(expandedCats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCats(next);
  };

  return (
    <div className="space-y-6 sticky top-8">
       <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-sm">
         <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
           <CardTitle className="text-lg flex items-center gap-3 font-black uppercase italic tracking-tight">
             <Filter className="w-5 h-5 text-primary" /> Filtry <span className="text-primary">Katalogu</span>
           </CardTitle>
         </CardHeader>
         <CardContent className="p-8 space-y-10">
           {/* Search */}
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Wyszukaj produkt</label>
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                 <input 
                   type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Model, Nazwa..."
                   className="w-full h-14 pl-12 pr-6 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 font-bold transition-all text-sm"
                 />
              </div>
           </div>

           {/* Categories */}
           <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Kategorie</label>
              <div className="space-y-2">
                 <button 
                   onClick={() => { setSelectedCatId(null); setSelectedSubcatId(null); }}
                   className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${!selectedCatId ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:bg-primary/5'}`}
                 >
                   <Layers className="w-4 h-4" /> Wszystkie
                 </button>
                 {categories.map(cat => (
                   <div key={cat.id} className="space-y-1">
                      <button onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(null); toggleCat(cat.id); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-bold uppercase transition-all ${selectedCatId === cat.id && !selectedSubcatId ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <span className="flex items-center gap-2 truncate"><TagIcon className="w-3.5 h-3.5" /> {cat.name}</span>
                        {cat.subcategories?.length > 0 && (expandedCats.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                      </button>
                      {expandedCats.has(cat.id) && cat.subcategories?.length > 0 && (
                        <div className="ml-8 space-y-1 border-l-2 border-slate-100 pl-3 py-1 animate-in slide-in-from-left-2 duration-300">
                          {cat.subcategories.map((sub: any) => (
                            <button key={sub.id} onClick={() => { setSelectedCatId(cat.id); setSelectedSubcatId(sub.id); }} className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-tighter ${selectedSubcatId === sub.id ? 'text-primary bg-primary/5' : 'text-slate-400 hover:text-slate-900'}`}>
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           {/* Manufacturer */}
           <div className="space-y-4 pt-6 border-t border-slate-100">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Producent</label>
              <select value={selectedManufacturer} onChange={e => setSelectedManufacturer(e.target.value)} className="w-full h-14 px-5 bg-white rounded-2xl border border-slate-200 outline-none font-bold text-sm text-slate-700">
                <option value="ALL">Wszyscy</option>
                {manufacturersList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
           </div>
         </CardContent>
       </Card>
    </div>
  );
}
