// src/app/sklep/_components/ShopSidebar.tsx
"use client";

import { Layers, Tag, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

interface IShopSidebarProps {
  categories: any[];
  selectedCatId: string | null;
  onSelect: (id: string | null) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

export function ShopSidebar({ categories, selectedCatId, onSelect, search, onSearchChange }: IShopSidebarProps) {
  return (
    <aside className="space-y-10 sticky top-28">
       {/* Search Box - Premium Style */}
       <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Wyszukaj w katalogu</label>
          <div className="relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-primary" />
             <input 
               type="text" 
               value={search}
               onChange={e => onSearchChange(e.target.value)}
               placeholder="🔍 Nazwa, model, indeks..."
               className="w-full h-14 pl-12 pr-6 bg-white rounded-3xl border border-slate-200 outline-none focus:ring-4 focus:ring-primary/10 font-bold transition-all text-sm placeholder:text-slate-300"
             />
          </div>
       </div>

       {/* Category List */}
       <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Kategorie</label>
             <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
          </div>
          
          <div className="flex flex-col gap-2">
             <button 
               onClick={() => onSelect(null)}
               className={`group flex items-center justify-between px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${
                 !selectedCatId 
                   ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                   : 'bg-white border border-slate-100 text-slate-600 hover:border-primary/30 hover:bg-primary/5'
               }`}
             >
               <span className="flex items-center gap-3"><Layers className="w-4 h-4" /> Wszystkie</span>
               {!selectedCatId && <ChevronRight className="w-4 h-4 text-primary animate-pulse" />}
             </button>

             {categories.map((cat: any) => (
                <button 
                  key={cat.id}
                  onClick={() => onSelect(cat.id)}
                  className={`group flex items-center justify-between px-6 py-4 rounded-[1.5rem] text-[11px] font-bold uppercase transition-all ${
                    selectedCatId === cat.id 
                      ? 'bg-primary/10 text-primary border-2 border-primary/20' 
                      : 'bg-white border border-slate-100 text-slate-500 hover:border-primary/20 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <span className="flex items-center gap-3"><Tag className="w-3.5 h-3.5 opacity-40" /> {cat.name}</span>
                  {selectedCatId === cat.id && <ChevronRight className="w-4 h-4" />}
                </button>
             ))}
          </div>
       </div>

       {/* Promotional Banner Placeholder */}
       <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-blue-500/10 border-2 border-dashed border-primary/20 relative overflow-hidden group cursor-pointer">
          <div className="relative z-10">
             <h4 className="text-xs font-black uppercase tracking-tighter text-primary mb-2 italic">Celtronics Pro</h4>
             <p className="text-[10px] font-bold text-blue-900/60 uppercase leading-relaxed">Instalujesz? <br/>Zaloguj się po rabat B2B.</p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
       </div>
    </aside>
  );
}
