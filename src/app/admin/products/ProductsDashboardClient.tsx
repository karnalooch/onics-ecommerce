// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback, useRef } from "react";
import { ProductHeader } from "./_components/ProductHeader";
import { ProductSidebar } from "./_components/ProductSidebar";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { AICommandCenter } from "./_components/AICommandCenter";
import { StructureApprovalModal } from "./_components/StructureApprovalModal";
import { 
  importProductsAction, 
  deleteProductAction, 
  generateAiDescriptionAction, 
  saveProductAction, 
  syncImportWithCatalogAction,
  syncProductWithIqAction,
  activateVirtualProductAction,
  wipeRegistryAction,
  autonomousProvisioningAction
} from "./_actions";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";
import { Button } from "@/components/ui/button";
import { 
  Database, Layers, Search, Trash2, Brain, Sparkles, Plus, 
  LayoutDashboard, Activity, Terminal, Eraser, Package, ClipboardList,
  GitBranch, X, ShieldCheck
} from "lucide-react";
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext";
import { useRouter } from "next/navigation";
import { StructureManager } from "../catalog/_components/StructureManager";

export function ProductsDashboardClient({ 
  initialProducts, 
  categories, 
  initialManufacturers,
  activeView = "crt"
}: { 
  initialProducts: any[], 
  categories: any[], 
  initialManufacturers?: any[],
  activeView?: "crt" | "verify"
}) {
  // 1. Data State
  const [products, setProducts] = useState(initialProducts);
  const [localCategories, setLocalCategories] = useState(categories);
  const [localManufacturers, setLocalManufacturers] = useState(initialManufacturers || []);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // V19.9: Universal Structure Hub state
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [pendingStructure, setPendingStructure] = useState<{
    categories: string[],
    subcategories: { parent: string, name: string }[],
    manufacturers: string[]
  }>({ categories: [], subcategories: [], manufacturers: [] });

  // 1.1 Global State (Zustand)
  const { 
    stagingPayload, 
    setStagingPayload, 
    setShowStaging, 
    updateStagingItem, 
    removeStagingItem, 
    clearStaging 
  } = useCatalogStore();

  // 1.2 Knowledge State (AI Context)
  const { 
    isDone, sessionResults, isTraining, progressPercent, 
    setTrainingFile 
  } = useKnowledge();

  // 1.3 UI States
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [processedSources, setProcessedSources] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // 2. Data Fetching & Sync
  const fetchKnowledgeData = useCallback(async () => {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      setKnowledgeSources(data.sources || []);
      setProcessedSources(data.processedSources || []);
    }
  }, []);

  useEffect(() => { fetchKnowledgeData(); }, [fetchKnowledgeData]);

  useEffect(() => {
    if (isDone && sessionResults && Object.keys(sessionResults).length > 0) {
       const aiItems = Object.entries(sessionResults).map(([sku, details]: [string, any]) => ({
          sku,
          name: details.model || details.name || sku,
          price: details.price || 0,
          stock: 0,
          manufacturer: details.manufacturer || "",
          xlsCategoryName: details.category || "",
          xlsSubcategoryName: details.subcategory || "",
          specs: details.specs || ""
       }));
       processInventoryData(aiItems, "Import AI");
    }
  }, [isDone, sessionResults]);

  const manufacturersList = useMemo(() => localManufacturers.map(m => m.name), [localManufacturers]);

  const refreshAllData = useCallback(async () => {
    setTimeout(async () => {
      router.refresh(); 
      const [resP, resC] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories')
      ]);
      
      if (resP.ok) {
        const updatedP = await resP.json();
        setProducts(updatedP);
      }
      if (resC.ok) {
        const updatedC = await resC.json();
        setLocalCategories(updatedC);
      }
      const resK = await fetch('/api/knowledge');
      if (resK.ok) {
        const dataK = await resK.json();
        setLocalManufacturers(dataK.registry?.manufacturers || []);
      }
      toast.success("Synchronizacja zakończona!");
    }, 500);
  }, [router]);

  const handleCommitAll = async () => {
    if (stagingPayload.length === 0) return;
    startTransition(async () => {
       const res = await importProductsAction(stagingPayload);
       if (res.success) {
          toast.success(res.message);
          clearStaging();
          await refreshAllData();
       } else {
          toast.error(res.error);
       }
    });
  };

  const handleGenerateAI = (id: string) => {
    setGeneratingId(id);
    startTransition(async () => {
      const res = await generateAiDescriptionAction(id);
      setGeneratingId(null);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setKnowledgeSources(prev => [file.name, ...prev]);
        toast.success(`Wgrano plik: ${file.name}.`);
      }
    } catch (err) {
      toast.error("Błąd podczas wgrywania pliku.");
    } finally { setIsUploading(false); }
  };

  const handleDeleteSource = async (filename: string) => {
    const res = await fetch(`/api/knowledge?source=${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
       setKnowledgeSources(prev => prev.filter(s => s !== filename));
       toast.success(`Usunięto źródło: ${filename}`);
       fetchKnowledgeData();
    }
  };

  const handleWipeRegistry = async () => {
    if (!confirm("UWAGA! Usuniesz CAŁY Centralny Rejestr Towarowy?")) return;
    startTransition(async () => {
        const res = await wipeRegistryAction();
        if (res.success) {
           setProducts([]);
           toast.success(res.message);
        } else toast.error(res.error);
    });
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (showInStockOnly && p.isVirtual) return false;
      const matchSearch = !searchTerm || (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !selectedCatId || p.categoryId === selectedCatId;
      const matchSub = !selectedSubcatId || p.subcategoryId === selectedSubcatId;
      const matchMan = selectedManufacturer === "ALL" || p.manufacturer === selectedManufacturer;
      return matchSearch && matchCat && matchSub && matchMan;
    });
  }, [products, searchTerm, selectedCatId, selectedSubcatId, selectedManufacturer, showInStockOnly]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const processInventoryData = useCallback((data: any[], sourceLabel = "Import") => {
    try {
      if (!data || data.length === 0) return;
      const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const normalize = (s: any) => String(s || "").replace(/\u00A0/g, " ").trim();
      const junkWords = ['NIEZNANY', 'INNE', 'NIESKLASYFIKOWANE', 'POZOSTAŁE', 'MISC', 'BRAK', 'PRODUKT', 'ARTYKUŁ', 'NIEZNANA'];
      const isJunk = (str: string) => junkWords.includes(normalize(str).toUpperCase());

      // V10.9: Persistent Sticky Cursor for Sectional Excel Layouts
      let lastKnownCat = "";
      let lastKnownSub = "";
      let lastKnownMnt = "";

      const staging = data.map((row, idx) => {
        const rowKeys = Object.keys(row);
        const findVal = (keys: string[], fallbackIndex?: number) => {
           if (!row) return undefined;
           const targetKeys = keys.map(k => cleanKey(k));
           const foundKey = rowKeys.find(k => targetKeys.some(tk => cleanKey(k).includes(tk)));
           if (foundKey) return row[foundKey];
           if (fallbackIndex !== undefined && fallbackIndex < rowKeys.length) return row[rowKeys[fallbackIndex]];
           return undefined;
        };

        // --- 1. RAW DATA EXTRACTION ---
        let inputCat = normalize(row.xlsCategoryName || findVal(["KATEGORIA"], 5));
        let inputSub = normalize(row.xlsSubcategoryName || findVal(["PODKATEGORIA"], 6));
        let mntName = normalize(row.manufacturer || findVal(["PRODUCENT"], 4));
        let skuVal = normalize(row.sku || findVal(["Symbol", "Kod", "SKU"], 2));
        let nameVal = normalize(row.name || findVal(["Nazwa", "Produkt"], 3));

        // --- 2. HISTORICAL SYNC (CRT LOOKUP) ---
        // If it already exists in your main database, your main DB is the source of truth
        const existingInCrt = initialProducts.find(p => p.sku === skuVal);
        const knowledgeMatched = !!existingInCrt;

        // --- 3. STICKY LOGIC (RECOVERING LOST HEADERS) ---
        if (inputCat && !isJunk(inputCat)) lastKnownCat = inputCat;
        else if (!inputCat && lastKnownCat) inputCat = lastKnownCat;

        if (inputSub && !isJunk(inputSub)) lastKnownSub = inputSub;
        else if (!inputSub && lastKnownSub) inputSub = lastKnownSub;

        if (mntName && !isJunk(mntName)) lastKnownMnt = mntName;
        else if (!mntName && lastKnownMnt) mntName = lastKnownMnt;

        let catId = existingInCrt?.categoryId || null;
        let subId = existingInCrt?.subcategoryId || null;
        if (knowledgeMatched && !mntName) mntName = existingInCrt.manufacturer;

        let statusReason = knowledgeMatched ? "Baza CRT: Znaleziono rekord" : "Nowy produkt";
        let qLevel: 'HIGH' | 'LOW' = knowledgeMatched ? 'HIGH' : 'LOW';

        // --- 4. FUZZY MATCHING (IF NOT ALREADY SYNCED) ---
        if (!catId && inputCat && !isJunk(inputCat)) {
           // Relaxed matching: same as resolveCategoryIds in parser.ts
           const cat = localCategories.find(c => {
             const cn = normalize(c.name).toLowerCase();
             const inc = inputCat.toLowerCase();
             return cn === inc || inc.includes(cn) || cn.includes(inc);
           });

           if (cat) {
              catId = cat.id;
              statusReason = knowledgeMatched ? `CRT Sync: ${cat.name}` : `Zmapowano: ${cat.name}`;
              qLevel = 'HIGH';
              if (!subId && inputSub && !isJunk(inputSub)) {
                 const sub = cat.subcategories.find((s: any) => {
                    const sn = normalize(s.name).toLowerCase();
                    const ins = inputSub.toLowerCase();
                    return sn === ins || ins.includes(sn) || sn.includes(ins);
                 });
                 if (sub) {
                    subId = sub.id;
                    statusReason += ` -> ${sub.name}`;
                 }
              }
           }
        }

        return {
           tempId: `stg_${idx}_${Date.now()}`,
           sku: skuVal || `sku_${idx}`,
           name: nameVal || "Produkt bez nazwy",
           price: Number(row.price || 0),
           stock: Number(row.stock || 0),
           manufacturer: mntName,
           categoryId: catId,
           subcategoryId: subId,
           xlsCategoryName: inputCat,
           xlsSubcategoryName: inputSub,
           isNewCategory: !catId && !!inputCat && !isJunk(inputCat),
           isNewSubcategory: catId && !subId && !!inputSub && !isJunk(inputSub),
           qualityLevel: qLevel,
           qualityReason: statusReason,
           knowledgeMatched,
           specs: row.specs || existingInCrt?.specs || "",
           isValid: true
        };
      });

      setStagingPayload(staging);
      const newCats = Array.from(new Set(staging.filter(i => i.isNewCategory).map(i => i.xlsCategoryName)));
      const newSubs = Array.from(new Set(staging.filter(i => i.isNewSubcategory).map(i => JSON.stringify({ parent: i.xlsCategoryName, name: i.xlsSubcategoryName })))).map(s => JSON.parse(s));
      const existingMansSet = new Set(localManufacturers.map(m => m.name.toLowerCase()));
      const newMans = Array.from(new Set(staging.filter(i => i.manufacturer && !isJunk(i.manufacturer) && !existingMansSet.has(i.manufacturer.toLowerCase())).map(i => i.manufacturer)));

      if (newCats.length > 0 || newSubs.length > 0 || newMans.length > 0) {
         setPendingStructure({ categories: newCats, subcategories: newSubs, manufacturers: newMans });
         setIsStructureModalOpen(true);
      }
      toast.success(`Hub: Przetworzono ${staging.length} pozycji.`);
    } catch (err: any) {
      toast.error(`Błąd importu: ${err.message}`);
    }
  }, [localCategories, localManufacturers, setStagingPayload, initialProducts]);

  const handleApproveStructure = () => {
     const tempCats = [...localCategories];
     pendingStructure.categories.forEach(name => {
        if (!tempCats.find(c => c.name === name)) {
           tempCats.push({ id: `temp_cat_${Date.now()}_${name}`, name, subcategories: [] });
        }
     });

     pendingStructure.subcategories.forEach(sub => {
        const cat = tempCats.find(c => c.name === sub.parent);
        if (cat) {
           if (!cat.subcategories.find((s: any) => s.name === sub.name)) {
              cat.subcategories.push({ id: `temp_sub_${Date.now()}_${sub.name}`, name: sub.name });
           }
        }
     });

     const remapped = stagingPayload.map(item => {
        if (item.isNewCategory || item.isNewSubcategory) {
           const cat = tempCats.find(c => c.name?.toLowerCase().trim() === item.xlsCategoryName?.toLowerCase().trim());
           if (cat) {
              const sub = item.xlsSubcategoryName ? cat.subcategories.find((s: any) => s.name?.toLowerCase().trim() === item.xlsSubcategoryName?.toLowerCase().trim()) : null;
              return {
                 ...item,
                 categoryId: cat.id,
                 subcategoryId: sub?.id || null,
                 isNewCategory: false,
                 isNewSubcategory: false,
                 qualityLevel: 'HIGH',
                 qualityReason: `Zatwierdzono: ${cat.name}`
              };
           }
        }
        return item;
     });

     setLocalManufacturers(prev => {
        const next = [...prev];
        pendingStructure.manufacturers.forEach(m => {
          if (!next.find(x => x.name === m)) {
            next.push({ id: `temp_m_${Date.now()}_${m}`, name: m });
          }
        });
        return next;
     });

     setStagingPayload(remapped);
     toast.success("Struktura zatwierdzona.");
     setIsStructureModalOpen(false);
  };

  if (activeView === "verify") {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-xl">
           <div className="space-y-1">
             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Centrum <span className="text-orange-600">Weryfikacji</span></h2>
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Przejrzyj i zatwierdź nowe produkty przed dodaniem do rejestru</p>
           </div>
           <div className="flex gap-4">
              <Button 
                variant="ghost" 
                onClick={handleWipeRegistry}
                className="h-14 px-6 rounded-2xl border-2 border-dashed border-red-100 hover:border-red-500 hover:bg-red-50 text-red-400 hover:text-red-600 font-black uppercase text-[10px] gap-3 shadow-sm transition-all"
              >
                <Eraser className="w-4 h-4" /> Wyczyść CRT
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="h-14 px-8 rounded-2xl border-2 border-orange-100 hover:border-orange-500 hover:bg-orange-50 font-black uppercase text-xs gap-3 shadow-lg transition-all"
              >
                <Plus className="w-5 h-5 text-orange-600" /> Importuj Nowy Plik
              </Button>
           </div>
        </div>

        <AICommandCenter 
           isOpen={isAiPanelOpen}
           onToggle={() => setIsAiPanelOpen(false)}
           sources={knowledgeSources}
           processedSources={processedSources}
           isUploading={isUploading}
           isTraining={isTraining}
           progressPercent={progressPercent}
           onUpload={handleFileUpload}
           onDeleteSource={handleDeleteSource}
           onTrainSource={setTrainingFile}
           onClearAll={handleWipeRegistry}
           knowledgeCount={0}
           onExcelParsed={processInventoryData}
           categories={localCategories}
           manufacturers={localManufacturers}
           onRefreshStructure={refreshAllData}
        />

        <StructureApprovalModal 
            isOpen={isStructureModalOpen}
            onClose={() => setIsStructureModalOpen(false)}
            onApprove={handleApproveStructure}
            newCategories={pendingStructure.categories}
            newSubcategories={pendingStructure.subcategories}
            newManufacturers={pendingStructure.manufacturers}
        />

        {stagingPayload.length > 0 ? (
          <StagingDashboard 
             payload={stagingPayload}
             importing={isPending}
             onClear={clearStaging}
             onCommitAll={handleCommitAll}
             onUpdateItem={updateStagingItem}
             onRemoveItem={removeStagingItem}
             onBatchUpdate={(ids: string[], field: string, value: any) => stagingPayload.filter(i => ids.includes(i.tempId)).forEach(i => updateStagingItem(i.tempId, field, value))}
             onBatchCommit={() => handleCommitAll()}
             onCommitItem={() => handleCommitAll()}
             categories={localCategories}
             manufacturers={manufacturersList}
             isItemConfirmed={() => true}
          />
        ) : (
          <div className="py-40 text-center bg-white/50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
             <ShieldCheck className="w-20 h-20 text-slate-200 mx-auto mb-6" />
             <h3 className="text-2xl font-black uppercase italic text-slate-400">Brak danych do weryfikacji</h3>
             <p className="text-sm font-bold text-slate-400 mt-2">Wszystkie produkty są aktualnie w Centralnym Rejestrze</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
        <ProductHeader 
           importing={isPending} 
           onImportClick={() => router.push('?tab=verify')}
           onAddNew={() => toast.info("Nowy moduł dodawania w drodze")}
           onWipe={handleWipeRegistry}
           isAiPanelOpen={false}
        />

        <div className="flex flex-col lg:flex-row gap-12 items-start">
           <aside className="w-full lg:w-96 shrink-0 lg:sticky lg:top-28">
              <ProductSidebar 
                 categories={localCategories}
                 searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                 selectedCatId={selectedCatId} setSelectedCatId={setSelectedCatId}
                 selectedSubcatId={selectedSubcatId} setSelectedSubcatId={setSelectedSubcatId}
                 selectedManufacturer={selectedManufacturer} setSelectedManufacturer={setSelectedManufacturer}
                 manufacturersList={manufacturersList}
                 showOnlyInStock={showInStockOnly}
                 setShowOnlyInStock={setShowInStockOnly}
              />
           </aside>

           <main className="flex-1 min-w-0">
              <ProductTable 
                 products={paginatedProducts}
                 onEdit={(p) => toast.info(`Podgląd ${p.sku}`)}
                 onDelete={(id) => deleteProductAction(id).then(res => res.success && setProducts(prev => prev.filter(x => x.id !== id)))}
                 onGenerateAI={handleGenerateAI}
                 onSyncIQ={activateVirtualProductAction}
                 generatingId={generatingId}
                 currentPage={currentPage}
                 totalPages={totalPages}
                 onPageChange={setCurrentPage}
                 pageSize={pageSize}
                 onPageSizeChange={setPageSize}
                 categories={localCategories}
              />
           </main>
        </div>
    </div>
  );
}

function HubStatButton({ active, icon, label, value, subValue, color = "orange", onClick, onClear, primaryClearLabel }: any) {
  const themes: any = {
    orange: 'bg-orange-500/10 dark:bg-orange-600/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20 ring-orange-500/20',
    blue: 'bg-blue-500/10 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20 ring-blue-500/20',
    emerald: 'bg-emerald-500/10 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20 ring-emerald-500/20'
  };

  return (
    <div onClick={onClick} className={`p-8 rounded-[2.5rem] border backdrop-blur-md flex items-center justify-between transition-all cursor-pointer hover:scale-[1.02] ${themes[color] || themes.orange} ${active ? 'ring-4' : ''}`}>
      <div className="flex items-center gap-6">
        <div className="p-4 bg-white/50 dark:bg-white/5 rounded-2xl shadow-sm">{icon}</div>
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">{label}</span>
          <span className="text-3xl font-black italic tracking-tighter tabular-nums">{value}</span>
          <span className="text-[9px] font-bold uppercase mt-1 opacity-60 tracking-wider whitespace-nowrap">{subValue}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onClear && (
           <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-3 rounded-xl bg-white/20 hover:bg-white/50 dark:hover:bg-white/10 transition-all text-current border border-transparent hover:border-current/20 group">
             <Trash2 className="w-4 h-4" />
           </button>
        )}
      </div>
    </div>
  );
}
