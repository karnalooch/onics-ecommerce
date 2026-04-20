// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback } from "react";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { AICommandCenter } from "./_components/AICommandCenter";
import { StructureApprovalModal } from "./_components/StructureApprovalModal";
import { 
  importProductsAction, 
  deleteProductAction, 
  generateAiDescriptionAction, 
  syncProductWithIqAction,
  activateVirtualProductAction,
  wipeRegistryAction
} from "./_actions";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";
import { ShieldCheck, LayoutGrid, Activity, Package } from "lucide-react";
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

  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [processedSources, setProcessedSources] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

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

  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // In the 'Elite Standard', filters are handled inside the ProductTable via Inline Fields.
  // For this demo, we'll keep the logic simple.
  const filtered = useMemo(() => products, [products]);
  const paginated = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize]);

  if (activeView === "verify") {
    return (
      <div className="space-y-6">
        <AICommandCenter isOpen={isAiPanelOpen} onToggle={() => setIsAiPanelOpen(prev => !prev)} sources={knowledgeSources} processedSources={processedSources} isUploading={isUploading} isTraining={isTraining} progressPercent={progressPercent} onUpload={() => {}} onDeleteSource={() => {}} onTrainSource={setTrainingFile} onClearAll={() => {}} knowledgeCount={knowledgeSources.length} onExcelParsed={handleProcessExcelData} categories={localCategories} manufacturers={localManufacturers} onRefreshStructure={refreshAllData} />
        <StructureApprovalModal isOpen={isStructureModalOpen} onClose={() => setIsStructureModalOpen(false)} onApprove={() => setIsStructureModalOpen(false)} newCategories={pendingStructure.categories} newSubcategories={pendingStructure.subcategories} newManufacturers={pendingStructure.manufacturers} />
        {stagingPayload.length > 0 ? (
          <StagingDashboard payload={stagingPayload} importing={isPending} onClear={clearStaging} onCommitAll={() => {}} onUpdateItem={updateStagingItem} onRemoveItem={removeStagingItem} onBatchUpdate={() => {}} onBatchCommit={() => {}} onCommitItem={() => {}} categories={localCategories} manufacturers={manufacturersList} isItemConfirmed={() => true} />
        ) : (
          <div className="py-20 text-center bg-white rounded-none border border-slate-100"><ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" /><h3 className="text-sm font-black uppercase text-slate-400">Brak danych do weryfikacji</h3></div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
        
        {/* ELITE MODULE HEADER (SATEL STYLE) */}
        <div className="flex items-end justify-between border-b-2 border-slate-950 pb-6">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-none shadow-xl">
                 <Package className="w-7 h-7" />
              </div>
              <div className="flex flex-col">
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic">Module_PIM</span>
                    <span className="w-8 h-[1px] bg-slate-200" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">CRT_Registry</span>
                 </div>
                 <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Katalog Produktów</h1>
              </div>
           </div>

           <div className="hidden md:flex items-center gap-10">
              <div className="flex flex-col items-end">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total_Indices</span>
                 <span className="text-2xl font-black text-slate-950 tabular-nums">{products.length}</span>
              </div>
              <div className="flex flex-col items-end border-l border-slate-100 pl-10">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global_Status</span>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-status-success rounded-full" />
                    <span className="text-[11px] font-black text-slate-950 uppercase italic">Active_Operational</span>
                 </div>
              </div>
           </div>
        </div>

        {/* STATS STRIP (DHL PATTERN) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
              { label: 'Oczekujące RMA', value: '12', icon: <Activity className="w-4 h-4" /> },
              { label: 'Nowe Nowości', value: '04', icon: <ShieldCheck className="w-4 h-4" /> },
              { label: 'Braki Magazynowe', value: '28', icon: <LayoutGrid className="w-4 h-4" /> },
              { label: 'Aktywne Oferty', value: '156', icon: <Package className="w-4 h-4" /> }
           ].map((stat, i) => (
              <div key={i} className="satel-card p-6 flex items-center justify-between group active-press">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-2xl font-black text-slate-950 mt-1">{stat.value}</span>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                    {stat.icon}
                 </div>
              </div>
           ))}
        </div>
        
        {/* MAIN DATA VIEWPORT (FLUID & DENSE) */}
        <main className="w-full">
           <ProductTable 
             products={paginated} 
             onEdit={() => {}} 
             onDelete={() => {}} 
             onGenerateAI={() => {}} 
             onSyncIQ={() => {}} 
             generatingId={generatingId} 
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
