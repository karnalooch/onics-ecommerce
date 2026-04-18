// src/app/admin/categories/CategoriesDashboardClient.tsx
"use client";

import { useState, useTransition } from "react";
import { FolderTree, Plus, Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic, Folder } from "lucide-react";
import { CategoryList } from "./_components/CategoryList";
import { IconPicker } from "./_components/IconPicker";
import { SubcategoryGrid } from "./_components/SubcategoryGrid";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addCategoryAction, updateCategoryAction, deleteCategoryAction } from "./_actions";
import { toast } from "sonner";

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
    startTransition(async () => {
      const res = await addCategoryAction(newCatName);
      if (res.success) {
        setNewCatName("");
        toast.success(res.message);
        if (res.data) setActiveCatId(res.data.id);
      } else toast.error(res.error);
    });
  };

  const handleUpdateIcon = (iconName: string) => {
    if (!activeCatId) return;
    startTransition(async () => {
      const res = await updateCategoryAction({ id: activeCatId, iconName });
      if (res.success) {
        setShowIconPicker(false);
        toast.success(res.message);
      } else toast.error(res.error);
    });
  };

  const handleAddSubcategory = () => {
    if (!activeCat || !newSubcatName.trim()) return;
    const subcategories = [...(activeCat.subcategories || []), { id: `s${Date.now()}`, name: newSubcatName.trim() }];
    startTransition(async () => {
      const res = await updateCategoryAction({ id: activeCat.id, subcategories });
      if (res.success) { setNewSubcatName(""); toast.success("Dodano nową gałąź"); }
      else toast.error(res.error);
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-7xl mx-auto pb-20">
       <header className="flex flex-col gap-2">
         <h2 className="text-4xl font-black tracking-tight flex items-center gap-4">
           <FolderTree className="h-10 w-10 text-primary" /> Struktura <span className="text-primary italic uppercase tracking-tighter">Katalogu</span>
         </h2>
         <p className="text-slate-500 font-medium">Zarządzaj hierarchią produktów i systemem ikon Celtronics B2B.</p>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
         <div className="col-span-1 md:col-span-4">
           <CategoryList 
             categories={initialCategories} activeCatId={activeCatId} onSelect={setActiveCatId} onAdd={handleAddCategory}
             onDelete={(id: string) => confirm("Usunąć kategorię?") && startTransition(async () => { await deleteCategoryAction(id); if (activeCatId === id) setActiveCatId(null); })}
             newCatName={newCatName} onNewCatNameChange={setNewCatName} renamingId={renamingId} renameValue={renameValue}
             onSetRenameValue={setRenameValue} onStartRename={(id: string, name: string) => { setRenamingId(id); setRenameValue(name); }}
             onConfirmRename={handleConfirmRename} onCancelRename={() => setRenamingId(null)}
           />
         </div>

         <main className="col-span-1 md:col-span-8">
            {activeCat ? (
              <Card className="shadow-2xl border-none rounded-[3rem] overflow-hidden bg-white/60 backdrop-blur-md">
                <CardHeader className="bg-primary/5 border-b border-primary/10 flex items-center justify-between p-8">
                  <div className="flex gap-6 items-center">
                    <button onClick={() => setShowIconPicker(!showIconPicker)} className="h-20 w-20 bg-white border-2 border-primary/20 rounded-[2rem] flex items-center justify-center hover:bg-primary/10 transition-all shadow-xl shadow-primary/5">
                      <span className="scale-[2] text-primary">{(() => { const Icon = ICON_MAP[activeCat.iconName] || Folder; return <Icon />; })()}</span>
                    </button>
                    <div>
                      <CardTitle className="text-3xl font-black text-slate-800 uppercase tracking-tight italic">Dział: {activeCat.name}</CardTitle>
                      <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Konfiguracja gałęzi i identyfikacji wizualnej</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-10">
                  {showIconPicker && <IconPicker currentIcon={activeCat.iconName} onSelect={handleUpdateIcon} onClose={() => setShowIconPicker(false)} />}
                  <SubcategoryGrid subcategories={activeCat.subcategories} renamingId={renamingId} renameValue={renameValue} onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }} onSetRenameValue={setRenameValue} onConfirmRename={handleConfirmRename} onCancelRename={() => setRenamingId(null)} onDelete={(subId) => confirm("Usunąć gałąź?") && handleConfirmRename(subId, "") /** Logic in grid or move here */ } />
                  <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4 max-w-lg">
                    <input type="text" value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)} placeholder="Nazwa nowej gałęzi..." className="flex h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 outline-none" />
                    <Button onClick={handleAddSubcategory} className="h-14 px-8 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl"><Plus className="w-4 h-4" /> Dodaj</Button>
                  </div>
                </CardContent>
              </Card>
            ) : <DetailEmptyState />}
         </main>
       </div>
    </div>
  );
}

function DetailEmptyState() {
  return (
    <div className="h-[600px] border-4 border-dashed border-slate-100 rounded-[4rem] flex flex-col items-center justify-center p-12 text-center text-slate-300 bg-slate-50/30">
      <FolderTree className="w-24 h-24 mb-6 opacity-20" />
      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Brak wybranego wydziału</h3>
      <p className="max-w-sm font-bold text-xs uppercase tracking-widest mt-2">Wybierz kategorię z listy po lewej stronie.</p>
    </div>
  );
}
