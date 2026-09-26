"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  FolderTree, Plus, Tv, Smartphone, Video, Network, Shield, Cpu, Zap, 
  Activity, Wrench, Home, Speaker, Mic, Folder, Terminal, Database,
  Settings, Layers, ChevronRight, Save, Trash2, Box, ShieldCheck,
  Globe
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
      const res = activeCat?.id === id
        ? await updateCategoryAction({ id, name })
        : activeCat
          ? await updateCategoryAction({
              id: activeCat.id,
              subcategories: activeCat.subcategories.map((s: any) =>
                s.id === id ? { ...s, name } : s
              ),
            })
          : null;

      if (res?.success) toast.success("LOG: Nazwa została zaktualizowana.");
      else if (res) toast.error(res.error);
      setRenamingId(null);
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (!confirm("Usunąć kategorię?")) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(id);
      if (res.success) {
        if (activeCatId === id) setActiveCatId(null);
        toast.success("LOG: Kategoria została usunięta.");
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleDeleteSubcategory = (subId: string) => {
    if (!activeCat || !confirm("Usunąć gałąź?")) return;
    const subcategories = (activeCat.subcategories || []).filter(
      (subcategory: any) => subcategory.id !== subId
    );

    startTransition(async () => {
      const res = await updateCategoryAction({
        id: activeCat.id,
        subcategories,
      });
      if (res.success) {
        toast.success("LOG: Gałąź została usunięta.");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-700 pb-20 max-w-[1920px] mx-auto select-none">
       
       {/* 1. CLASSIFICATION HEADER (FLUENT) */}
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-xl shadow-2xl shadow-primary/30">
              <FolderTree className="w-8 h-8" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Architektura Systemu</span>
                 <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
                 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Category_Manager_v4</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-1">Struktura Katalogu</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aktywne Sekcje</span>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">{initialCategories.length}</span>
                 <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/40 animate-pulse" />
              </div>
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
              onDelete={handleDeleteCategory}
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="fluent-card p-0 border-white/10 overflow-hidden shadow-2xl flex flex-col min-h-[700px]"
                >
                  <div className="p-10 bg-primary/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10 flex flex-col md:flex-row items-center gap-10">
                    <button 
                       onClick={() => setShowIconPicker(!showIconPicker)} 
                       className="w-28 h-28 bg-white dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-2xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/5 transition-all active-press relative group shadow-xl"
                    >
                       <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                       <span className="text-primary relative z-10 transition-transform group-hover:scale-110">
                          {(() => { const Icon = ICON_MAP[activeCat.iconName] || Folder; return <Icon size={48} />; })()}
                       </span>
                       <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                          <Settings className="w-4 h-4 animate-spin-slow" />
                       </div>
                    </button>
                    
                    <div className="flex-1 flex flex-col">
                       <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-3 py-1">NODE_ID: {activeCat.id.substring(0,8).toUpperCase()}</Badge>
                       </div>
                       <h3 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-3">Dział: {activeCat.name}</h3>
                       <p className="text-sm font-medium text-muted-foreground mt-2 opacity-70">Zdefiniuj parametry wizualne oraz strukturę klastrów dla tego wydziału.</p>
                    </div>
                  </div>

                  <div className="p-12 flex-1 space-y-16">
                    {showIconPicker && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         className="border-b border-black/5 dark:border-white/5 pb-12 overflow-hidden"
                       >
                          <IconPicker currentIcon={activeCat.iconName} onSelect={handleUpdateIcon} onClose={() => setShowIconPicker(false)} />
                       </motion.div>
                    )}
                    
                    <div className="space-y-8">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
                             <Layers className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Gałęzie Podrzędne (Clusters)</h4>
                       </div>
                       
                       <SubcategoryGrid 
                         subcategories={activeCat.subcategories} 
                         renamingId={renamingId} 
                         renameValue={renameValue} 
                         onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }} 
                         onSetRenameValue={setRenameValue} 
                         onConfirmRename={handleConfirmRename} 
                         onCancelRename={() => setRenamingId(null)} 
                         onDelete={handleDeleteSubcategory} 
                       />

                       <div className="pt-10 mt-16 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row gap-6 items-end">
                          <div className="flex-1 space-y-3 w-full">
                             <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 opacity-60">Zdefiniuj Nowy Cluster</label>
                             <div className="relative group">
                                <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                                <input 
                                   type="text" 
                                   value={newSubcatName} 
                                   onChange={e => setNewSubcatName(e.target.value)} 
                                   placeholder="Np. Kamery_IP_Pro..." 
                                   className="w-full h-14 pl-12 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl text-[14px] font-medium outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner" 
                                />
                             </div>
                          </div>
                          <button 
                             onClick={handleAddSubcategory} 
                             className="h-14 px-10 bg-primary text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-3 transition-all hover:brightness-110 active:scale-95 shadow-xl shadow-primary/20 rounded-xl whitespace-nowrap"
                          >
                             <Save className="w-4 h-4" /> DODAJ DO STRUKTURY
                          </button>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Spójność Struktury: VERIFIED</span>
                     </div>
                     <Activity className="w-4 h-4 text-muted-foreground/20" />
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
    <div className="h-[700px] bg-primary/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center p-20 text-center">
      <Box className="w-24 h-24 mb-8 text-primary/10 opacity-30" />
      <h3 className="text-3xl font-extrabold text-foreground tracking-tight">Wybierz wydział z listy</h3>
      <p className="max-w-[320px] font-medium text-sm text-muted-foreground mt-4 leading-relaxed opacity-60">Aby edytować parametry techniczne i mapę klastrów, selektuj kategorię z panelu bocznego.</p>
    </div>
  );
}
