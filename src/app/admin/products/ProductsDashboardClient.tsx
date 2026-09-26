// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback } from "react";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { AICommandCenter } from "./_components/AICommandCenter";
import { StructureApprovalModal } from "./_components/StructureApprovalModal";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";
import { ShieldCheck, Activity, Package, HardDrive } from "lucide-react";
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext";
import { useRouter } from "next/navigation";
import { IProduct, ICategory, IManufacturer } from "./_lib/types";
import { processInventoryData } from "./_lib/inventoryLogic";

export function ProductsDashboardClient({ 
  initialProducts, 
  categories, 
  initialManufacturers,
  activeView = "crt"
}: { 
  initialProducts: IProduct[], 
  categories: ICategory[], 
  initialManufacturers?: IManufacturer[],
  activeView?: "crt" | "verify"
}) {
  const [products, setProducts] = useState<IProduct[]>(initialProducts);
  const [localCategories, setLocalCategories] = useState<ICategory[]>(categories);
  const [localManufacturers, setLocalManufacturers] = useState<IManufacturer[]>(initialManufacturers || []);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [pendingStructure, setPendingStructure] = useState<{
    categories: string[],
    subcategories: { parent: string, name: string }[],
    manufacturers: string[]
  }>({ categories: [], subcategories: [], manufacturers: [] });

  const { stagingPayload, setStagingPayload, clearStaging, updateStagingItem, removeStagingItem } = useCatalogStore();
  const { isDone, sessionResults, isTraining, progressPercent, setTrainingFile } = useKnowledge();

  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [processedSources, setProcessedSources] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fetchKnowledgeData = useCallback(async () => {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      setKnowledgeSources(data.sources || []);
      setProcessedSources(data.processedSources || []);
      if (Array.isArray(data.registry?.categories)) {
        setLocalCategories(data.registry.categories);
      }
      if (Array.isArray(data.registry?.manufacturers)) {
        setLocalManufacturers(data.registry.manufacturers);
      }
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
       handleProcessExcelData(aiItems);
    }
  }, [isDone, sessionResults]);

  const manufacturersList = useMemo(() => localManufacturers.map(m => m.name), [localManufacturers]);

  const refreshAllData = useCallback(async () => {
    router.refresh(); 
    const [resP, resC] = await Promise.all([fetch('/api/products'), fetch('/api/categories')]);
    if (resP.ok) setProducts(await resP.json());
    if (resC.ok) setLocalCategories(await resC.json());
  }, [router]);

  const handleProcessExcelData = (data: any[]) => {
    const { staging, pendingStructure: ps } = processInventoryData(data, products, localCategories, localManufacturers);
    setStagingPayload(staging);
    if (ps.categories.length > 0 || ps.subcategories.length > 0 || ps.manufacturers.length > 0) {
      setPendingStructure(ps);
      setIsStructureModalOpen(true);
    }
    toast.success(`Przetworzono ${staging.length} pozycji.`);
  };

  const readResponseError = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => ({}));
    return typeof payload?.error === "string" ? payload.error : fallback;
  };

  const commitStagingItems = (items: any[]) => {
    if (items.length === 0) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "IMPORT_WFMAG", items }),
        });

        if (!response.ok) {
          throw new Error(
            await readResponseError(response, "Nie udało się zapisać produktów.")
          );
        }

        const result = await response.json();
        const committedIds = new Set(items.map((item) => item.tempId));
        setStagingPayload(
          stagingPayload.filter((item) => !committedIds.has(item.tempId))
        );
        await Promise.all([refreshAllData(), fetchKnowledgeData()]);

        const deferred = Number(result.deferredStockCount || 0);
        if (deferred > 0) {
          toast.warning(
            `Import zapisany. ${deferred} zmian stanu odroczono z powodu aktywnego lifecycle magazynowego.`
          );
        } else {
          toast.success(
            `Import zapisany: ${Number(result.updatedCount || 0)} zaktualizowano, ${Number(result.addedCount || 0)} dodano.`
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Błąd zapisu produktów."
        );
      }
    });
  };

  const handleCommitAll = () => commitStagingItems(stagingPayload);

  const handleCommitItem = (tempId: string) => {
    const item = stagingPayload.find((candidate) => candidate.tempId === tempId);
    if (item) commitStagingItems([item]);
  };

  const handleBatchCommit = (ids: string[]) => {
    const selected = new Set(ids);
    commitStagingItems(
      stagingPayload.filter((item) => selected.has(item.tempId))
    );
  };

  const handleBatchUpdate = (ids: string[], field: string, value: any) => {
    const selected = new Set(ids);
    setStagingPayload(
      stagingPayload.map((item) =>
        selected.has(item.tempId) ? { ...item, [field]: value } : item
      )
    );
  };

  const isStagingItemConfirmed = (item: any) => {
    const price = Number(item.price);
    const stock = Number(item.stock);
    const hasCategory =
      Boolean(item.categoryId) || Boolean(String(item.xlsCategoryName || "").trim());

    return (
      Boolean(String(item.sku || "").trim()) &&
      Boolean(String(item.name || "").trim()) &&
      Boolean(String(item.manufacturer || "").trim()) &&
      hasCategory &&
      Number.isFinite(price) &&
      price >= 0 &&
      Number.isFinite(stock) &&
      stock >= 0
    );
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Usunąć ten produkt z katalogu?")) return;

    try {
      const response = await fetch(
        `/api/products?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          await readResponseError(response, "Nie udało się usunąć produktu.")
        );
      }
      setProducts((previous) => previous.filter((product) => product.id !== id));
      toast.success("Produkt usunięty.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Błąd usuwania produktu."
      );
    }
  };

  const handleKnowledgeUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(
          await readResponseError(response, "Nie udało się wgrać katalogu.")
        );
      }

      const result = await response.json();
      await fetchKnowledgeData();
      toast.success(result.message || "Katalog został zapisany.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Błąd wgrywania katalogu."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearKnowledge = async () => {
    if (!window.confirm("Wyczyścić bazę wiedzy i listę źródeł?")) return;

    try {
      const response = await fetch("/api/knowledge", { method: "DELETE" });
      if (!response.ok) {
        throw new Error(
          await readResponseError(response, "Nie udało się wyczyścić bazy wiedzy.")
        );
      }
      setKnowledgeSources([]);
      setProcessedSources([]);
      toast.success("Baza wiedzy została wyczyszczona.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Błąd czyszczenia bazy wiedzy."
      );
    }
  };

  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => products, [products]);
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  const catalogStats = useMemo(() => {
    const stockTotal = products.reduce(
      (sum, product) => sum + Math.max(0, Number(product.stock) || 0),
      0
    );
    const unpricedCount = products.filter(
      (product) =>
        !Number.isFinite(Number(product.price)) || Number(product.price) <= 0
    ).length;
    const incompleteCount = products.filter(
      (product) =>
        !String(product.sku || "").trim() ||
        !String(product.name || "").trim() ||
        !String(product.manufacturer || "").trim() ||
        !product.categoryId
    ).length;

    return [
      {
        label: "Indeksy katalogowe",
        value: products.length.toLocaleString("pl-PL"),
        icon: <Package className="w-5 h-5 text-primary" />,
        sector: "Katalog",
      },
      {
        label: "Sztuki na stanie",
        value: stockTotal.toLocaleString("pl-PL"),
        icon: <HardDrive className="w-5 h-5 text-primary" />,
        sector: "Magazyn",
      },
      {
        label: "Pozycje bez ceny",
        value: unpricedCount.toLocaleString("pl-PL"),
        icon: <Activity className="w-5 h-5 text-primary" />,
        sector: "Cennik",
      },
      {
        label: "Do uzupełnienia",
        value: incompleteCount.toLocaleString("pl-PL"),
        icon: <ShieldCheck className="w-5 h-5 text-primary" />,
        sector: "Jakość danych",
      },
    ];
  }, [products]);

  if (activeView === "verify") {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <AICommandCenter
          isOpen={isAiPanelOpen}
          onToggle={() => setIsAiPanelOpen((previous) => !previous)}
          sources={knowledgeSources}
          processedSources={processedSources}
          isUploading={isUploading}
          isTraining={isTraining}
          progressPercent={progressPercent}
          onUpload={handleKnowledgeUpload}
          onTrainSource={setTrainingFile}
          onClearAll={handleClearKnowledge}
          knowledgeCount={knowledgeSources.length}
          onExcelParsed={handleProcessExcelData}
          categories={localCategories}
          manufacturers={localManufacturers}
          onRefreshStructure={refreshAllData}
        />
        <StructureApprovalModal
          isOpen={isStructureModalOpen}
          onClose={() => setIsStructureModalOpen(false)}
          onApprove={() => setIsStructureModalOpen(false)}
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
            onRemoveItem={(id) => removeStagingItem(id)}
            onBatchUpdate={handleBatchUpdate}
            onBatchCommit={handleBatchCommit}
            onCommitItem={handleCommitItem}
            categories={localCategories}
            manufacturers={manufacturersList}
            isItemConfirmed={isStagingItemConfirmed}
          />
        ) : (
          <div className="py-32 text-center fluent-card border-white/10 group cursor-pointer active-press">
            <ShieldCheck className="w-16 h-16 text-primary/20 mx-auto mb-6 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-foreground">Gotowy do importu</h3>
            <p className="text-sm text-muted-foreground mt-2">Wybierz plik Excel lub PDF, aby rozpocząć proces.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-500 pb-20">
        
        {/* FLUENT MODULE HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-xl shadow-2xl shadow-primary/30">
                 <Package className="w-8 h-8" />
              </div>
              <div className="flex flex-col">
                 <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Zarządzanie Produktami</span>
                    <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rejestr PIM</span>
                 </div>
                 <h1 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mt-1">Katalog Produktów</h1>
              </div>
           </div>

           <div className="flex items-center gap-12">
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Indeksów Razem</span>
                 <span className="text-3xl font-extrabold text-foreground tabular-nums">{products.length}</span>
              </div>
              <div className="flex flex-col items-end pl-12 border-l border-black/5 dark:border-white/10">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stan widoku</span>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-500/40" />
                    <span className="text-[12px] font-bold text-foreground uppercase tracking-tight">Dane załadowane</span>
                 </div>
              </div>
           </div>
        </div>

        {/* STATS STRIP (FLUENT CARDS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {catalogStats.map((stat, i) => (
              <div key={i} className="fluent-card p-8 flex items-center justify-between group active-press border-white/5 shadow-xl">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.sector}</span>
                    <span className="text-3xl font-extrabold text-foreground leading-none">{stat.value}</span>
                    <span className="text-[11px] font-bold text-muted-foreground mt-3 uppercase tracking-tight">{stat.label}</span>
                 </div>
                 <div className="w-12 h-12 rounded-xl bg-primary/5 dark:bg-white/5 flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white group-hover:scale-110">
                    {stat.icon}
                 </div>
              </div>
           ))}
        </div>
        
        {/* MAIN DATA VIEWPORT */}
        <main className="w-full">
           <ProductTable 
             products={paginated} 
             onDelete={handleDeleteProduct}
             currentPage={currentPage} 
             totalPages={Math.ceil(filtered.length / pageSize)} 
             onPageChange={setCurrentPage} 
             pageSize={pageSize} 
             onPageSizeChange={setPageSize} 
             categories={localCategories} 
           />
        </main>
    </div>
  );
}
