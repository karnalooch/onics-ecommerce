// src/app/admin/catalog/_components/StructureManager.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Building2, 
  Layers, 
  AlertTriangle,
  Zap,
  ArrowRight
} from "lucide-react";
import { manageStructureAction } from "../../products/_actions";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";
import { motion, AnimatePresence } from "framer-motion";

interface IStructureManagerProps {
  categories: any[];
  manufacturers: any[];
  onRefresh: () => void;
}

export function StructureManager({ categories, manufacturers, onRefresh }: IStructureManagerProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'manufacturers'>('categories');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { setStagingPayload, setShowStaging } = useCatalogStore();

  const handleUpdate = async (type: any, id: string) => {
    const res = await manageStructureAction(type, 'update', id, { name: editValue });
    if (res.success) {
      toast.success(res.message);
      setEditingId(null);
      onRefresh();
    } else toast.error(res.error);
  };

  const handleDelete = async (type: any, id: string, name: string) => {
    if (!confirm(`UWAGA! Czy na pewno chcesz usunąć "${name}"? Jest to element Twojej struktury. Wszystkie powiązane z nim produkty zostaną przeniesione na BIURKO do kwarantanny.`)) return;
    
    const res = await manageStructureAction(type, 'delete', id);
    if (res.success) {
      toast.warning(res.message);
      if (res.data && res.data.length > 0) {
        setStagingPayload((prev: any[]) => [...prev, ...res.data]);
        setShowStaging(true);
      }
      onRefresh();
    } else toast.error(res.error);
  };

  return (
    <div className="bg-white/40 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3.5rem] border border-white dark:border-slate-800 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-1000">
       
       {/* ARCHITECTURAL HEADER */}
       <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950/20">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
             <div className="flex items-center gap-6">
                <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                   <div className="relative p-5 bg-slate-900 text-white rounded-[1.8rem] shadow-xl">
                      <Layers className="w-8 h-8" />
                   </div>
                </div>
                <div>
                   <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none dark:text-white">
                      Architektura <span className="text-primary italic">Danych</span>
                   </h3>
                   <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.4em] mt-2 italic">Global Taxonomy & Structure Controller</p>
                </div>
             </div>

             <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-inner relative">
                <div className="absolute inset-y-1.5 transition-all duration-500 ease-out bg-primary rounded-[1.5rem] shadow-lg shadow-primary/20" 
                     style={{ 
                       left: activeTab === 'categories' ? '6px' : 'calc(50% + 1px)',
                       width: 'calc(50% - 7px)'
                     }} 
                />
                <button 
                  onClick={() => setActiveTab('categories')}
                  className={`relative z-10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${activeTab === 'categories' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Kategorie
                </button>
                <button 
                  onClick={() => setActiveTab('manufacturers')}
                  className={`relative z-10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${activeTab === 'manufacturers' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Producenci
                </button>
             </div>
          </div>
       </div>

       {/* CONTENT GRID */}
       <div className="p-10 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {(activeTab === 'categories' ? categories : manufacturers).map((item: any, idx: number) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative p-6 bg-white/60 dark:bg-slate-800/40 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] hover:border-primary/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between">
                        <div className={`p-4 rounded-2xl ${activeTab === 'categories' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'}`}>
                           {activeTab === 'categories' ? <Folder className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                           <button 
                             onClick={() => { setEditingId(item.id); setEditValue(item.name); }} 
                             className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary transition-all"
                           >
                              <Edit3 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDelete(activeTab === 'categories' ? 'category' : 'manufacturer', item.id, item.name)} 
                             className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-500 transition-all"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     {editingId === item.id ? (
                        <div className="space-y-3 pt-2">
                           <Input 
                             value={editValue} 
                             onChange={e => setEditValue(e.target.value)} 
                             className="h-12 rounded-xl font-black text-xs uppercase tracking-widest bg-white dark:bg-slate-900 border-2 border-primary/30 focus:border-primary"
                             autoFocus
                           />
                           <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdate(activeTab === 'categories' ? 'category' : 'manufacturer', item.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-xl h-10 font-black uppercase text-[9px] tracking-widest text-white shadow-lg">
                                 <Check className="w-3.5 h-3.5 mr-2" /> Zapisz
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl h-10 px-4 text-slate-400">
                                 <X className="w-3.5 h-3.5" />
                              </Button>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-1">
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-snug group-hover:text-primary transition-colors">{item.name}</h4>
                           {activeTab === 'categories' && (
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.subcategories.length} Podgałęzi</span>
                                <ArrowRight className="w-3 h-3 text-slate-200" />
                             </div>
                           )}
                        </div>
                     )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
          
          {(activeTab === 'categories' ? categories.length : manufacturers.length) === 0 && (
             <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] opacity-30 italic">
                <Zap className="w-16 h-16 mb-4 text-slate-300" />
                <p className="text-xs font-black uppercase tracking-[0.4em]">Struktura Inicjalna</p>
             </div>
          )}
       </div>
       
       {/* SAFETY DOCK */}
       <div className="p-10 bg-slate-900 text-white">
          <div className="flex items-start gap-6 max-w-4xl">
             <div className="p-4 bg-primary/20 rounded-[1.5rem] border border-primary/30 shadow-[0_0_20px_rgba(255,165,0,0.2)]">
                <AlertTriangle className="w-8 h-8 text-primary" />
             </div>
             <div className="space-y-2">
                <h5 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-3">Protokół Bezpieczeństwa <span className="text-primary italic">V16 Secure</span></h5>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest max-w-2xl">
                   System automatycznie monitoruje usuwane gałęzie struktury. Każdy osierocony produkt jest automatycznie kierowany do modułu Kwarantanny (Biurko) w celu ponownej weryfikacji. 
                   <span className="text-white ml-2">Żaden bajt danych nie zostanie utracony.</span>
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}
