"use client";

import { useState, useTransition } from "react";
import { 
  FolderTree, Plus, Tv, Smartphone, Video, Network, Shield, Cpu, Zap, 
  Activity, Wrench, Home, Speaker, Mic, Folder, Terminal, Database,
  Settings, Layers, ChevronRight, Save, Trash2, Box
} from "lucide-react";
import { CategoryList } from "./_components/CategoryList";
import { IconPicker } from "./_components/IconPicker";
import { SubcategoryGrid } from "./_components/SubcategoryGrid";
import { Button } from "@/components/ui/button";
import { addCategoryAction, updateCategoryAction, deleteCategoryAction } from "./_actions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const ICON_MAP: Record<string, any> = { Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic, Folder };

export function CategoriesDashboardClient({ initialCategories }: { initialCategories: any[] }) {
  const [activeCatId, setActiveCatId] = useState<string | null>(initialCategories[0]?.id || null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSubcatName, setNewSubcatName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeCat = initialCategories.find(c => c.id === activeCatId);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    startTransition(async () => {
      const res = await addCategoryAction(newCatName);
      if (res.success) {
        setNewCatName("");
        toast.success("LOG: Nowa kategoria dodana do rejestru.");
        if (res.data) setActiveCatId(res.data.id);
      } else toast.error("FAULT: Błąd zapisu kategorii.");
    });
  };

  const handleUpdateIcon = (iconName: string) => {
    if (!activeCatId) return;
    startTransition(async () => {
      const res = await updateCategoryAction({ id: activeCatId, iconName });
      if (res.success) {
        setShowIconPicker(false);
        toast.success("LOG: Identyfikator wizualny zaktualizowany.");
      } else toast.error("FAULT: Błąd synchronizacji ikony.");
    });
  };

  const handleAddSubcategory = () => {
    if (!activeCat || !newSubcatName.trim()) return;
    const subcategories = [...(activeCat.subcategories || []), { id: `s${Date.now()}`, name: newSubcatName.trim() }];
    startTransition(async () => {
      const res = await updateCategoryAction({ id: activeCat.id, subcategories });
      if (res.success) { 
        setNewSubcatName(""); 
        toast.success("LOG: Nowa gałąź zdefiniowana pod klastrem."); 
      }
      else toast.error("FAULT: Błąd rozszerzania struktury.");
    });
  };

  const handleConfirmRename = (id: string, name: string) => {
    if (!name.trim()) return setRenamingId(null);
    startTransition(async () => {
       if (activeCat?.id === id) await updateCategoryAction({ id, name });
       else if (activeCat) {
         const subcategories = activeCat.subcategories.map((s: any) => s.id === id ? { ...s, name } : s);
         await updateCategoryAction({ id: activeCat.id, subcategories });
       }
       setRenamingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20 no-blur max-w-[1920px] mx-auto select-none">
       
       {/* 1. CLASSIFICATION HEADER */}
       <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-8 border-b-2 border-slate-950 pb-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center shadow-xl">
              <FolderTree className="w-7 h-7 text-primary" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">STRUCTURAL_ARCHITECT</span>
                 <div className="w-8 h-[1px] bg-slate-200" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Category_Manager_v4</span>
              </div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Struktura Katalogu</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-6 bg-slate-50 p-2 border border-slate-100 h-14 px-8">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">TOTAL_MODULES</span>
              <span className="text-xl font-black text-slate-950 tabular-nums italic mt-1 leading-none">{initialCategories.length}</span>
           </div>
           <div className="h-6 w-[1px] bg-slate-200 mx-2" />
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">SYSTEM_STATUS</span>
              <span className="text-[10px] font-black text-status-success uppercase tabular-nums tracking-[0.2em] mt-2 bg-status-success/10 px-2 py-0.5 border border-status-success/20">OPERATIONAL</span>
           </div>
        </div>
      </div>

       <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
         
         {/* SECTOR_NAVIGATOR (LEFT) */}
         <aside className="xl:col-span-4">
            <CategoryList 
              categories={initialCategories} 
              activeCatId={activeCatId} 
              onSelect={setActiveCatId} 
              onAdd={handleAddCategory}
              onDelete={(id: string) => confirm("Usunąć kategorię?") && startTransition(async () => { await deleteCategoryAction(id); if (activeCatId === id) setActiveCatId(null); })}
              newCatName={newCatName} 
              onNewCatNameChange={setNewCatName} 
              renamingId={renamingId} 
              renameValue={renameValue}
              onSetRenameValue={setRenameValue} 
              onStartRename={(id: string, name: string) => { setRenamingId(id); setRenameValue(name); }}
              onConfirmRename={handleConfirmRename} 
              onCancelRename={() => setRenamingId(null)}
            />
         </aside>

         {/* DETAIL_TERMINAL (CENTER/RIGHT) */}
         <main className="xl:col-span-8">
            <AnimatePresence mode="wait">
              {activeCat ? (
                <motion.div 
                  key={activeCat.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none flex flex-col min-h-[700px]"
                >
                  <div className="p-8 bg-slate-950 flex flex-col md:flex-row items-center gap-8 border-b border-white/5">
                    <button 
                       onClick={() => setShowIconPicker(!showIconPicker)} 
                       className="w-24 h-24 bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active-press relative group overflow-hidden"
                    >
                       <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                       <span className="text-primary relative z-10">
                          {(() => { const Icon = ICON_MAP[activeCat.iconName] || Folder; return <Icon size={40} />; })()}
                       </span>
                       <div className="absolute bottom-1 right-1">
                          <Settings className="w-3 h-3 text-slate-500 opacity-20" />
                       </div>
                    </button>
                    <div className="flex-1 flex flex-col">
                       <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic leading-none">ACTIVE_NODE_ID: {activeCat.id.substring(0,6).toUpperCase()}</span>
                       </div>
                       <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mt-2 leading-none">Dział: {activeCat.name}</h3>
                       <div className="flex items-center gap-4 mt-4">
                          <div className="h-[2px] w-6 bg-slate-700" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Konfiguracja parametrów wizualnych i gałęzi</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <button className="h-10 px-5 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all italic">
                          DOKUMENTACJA_SEC
                       </button>
                    </div>
                  </div>

                  <div className="p-10 flex-1 space-y-12">
                    {showIconPicker && (
                       <div className="border-b border-slate-100 pb-12">
                          <IconPicker currentIcon={activeCat.iconName} onSelect={handleUpdateIcon} onClose={() => setShowIconPicker(false)} />
                       </div>
                    )}
                    
                    <div className="space-y-6">
                       <div className="flex items-center gap-4 text-slate-900 border-l-4 border-primary pl-4">
                          <Layers className="w-5 h-5 text-primary" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] italic">Hierarchia Podkategorii (Clusters)</h4>
                       </div>
                       
                       <SubcategoryGrid 
                         subcategories={activeCat.subcategories} 
                         renamingId={renamingId} 
                         renameValue={renameValue} 
                         onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }} 
                         onSetRenameValue={setRenameValue} 
                         onConfirmRename={handleConfirmRename} 
                         onCancelRename={() => setRenamingId(null)} 
                         onDelete={(subId) => confirm("Usunąć gałąź?") && handleConfirmRename(subId, "") } 
                       />

                       <div className="pt-8 mt-12 border-t border-slate-50 flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 space-y-2 w-full">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Zdefiniuj Nową Gałąź</label>
                             <div className="relative group">
                                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
                                <input 
                                   type="text" 
                                   value={newSubcatName} 
                                   onChange={e => setNewSubcatName(e.target.value)} 
                                   placeholder="ALFANUMERYCZNA_NAZWA_CLUSTER..." 
                                   className="w-full h-12 pl-12 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase italic outline-none focus:bg-white focus:border-primary transition-all" 
                                />
                             </div>
                          </div>
                          <button 
                             onClick={handleAddSubcategory} 
                             className="h-12 px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all hover:bg-primary active-press italic shadow-xl shadow-primary/10 whitespace-nowrap"
                          >
                             <Save className="w-4 h-4 text-primary" /> DODAJ_DO_STRUKTURY
                          </button>
                       </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-status-success" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Structure_Integrity: VERIFIED</span>
                     </div>
                     <Activity className="w-4 h-4 text-slate-200" />
                  </div>
                </motion.div>
              ) : (
                <DetailEmptyState />
              )}
            </AnimatePresence>
         </main>
       </div>
    </div>
  );
}

function DetailEmptyState() {
  return (
    <div className="h-[700px] bg-slate-50/30 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center p-20 text-center">
      <Box className="w-20 h-20 mb-8 text-slate-200 opacity-20" />
      <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-tighter">Brak wybranego wydziału</h3>
      <p className="max-w-[280px] font-black text-[10px] text-slate-400 uppercase tracking-widest mt-4 leading-relaxed">Wybierz kategorię z listy rejestracyjnej po lewej stronie, aby edytować jej parametry techniczne.</p>
    </div>
  );
}
