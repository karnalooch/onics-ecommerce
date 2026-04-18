// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { ProductHeader } from "./_components/ProductHeader";
import { ProductSidebar } from "./_components/ProductSidebar";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { WfMagUploadButton } from "./_components/WfMagUploadButton";
import { importProductsAction, deleteProductAction, generateAiDescriptionAction, saveProductAction } from "./_actions";
import { toast } from "sonner";

export function ProductsDashboardClient({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  // 1. Data State
  const [products, setProducts] = useState(initialProducts);
  const [isPending, startTransition] = useTransition();

  // 2. Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 3. Staging State (Excel Import)
  const [stagingPayload, setStagingPayload] = useState<any[]>([]);
  const [showStaging, setShowStaging] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  // 4. UI State
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Derived Values
  const manufacturersList = useMemo(() => Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))), [products]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !selectedCatId || p.categoryId === selectedCatId;
      const matchSub = !selectedSubcatId || p.subcategoryId === selectedSubcatId;
      const matchMan = selectedManufacturer === "ALL" || p.manufacturer === selectedManufacturer;
      return matchSearch && matchCat && matchSub && matchMan;
    });
  }, [products, searchTerm, selectedCatId, selectedSubcatId, selectedManufacturer]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  // Handlers - Import Logic
  const handleExcelParsed = (data: any[]) => {
    const staging = data.map((row: any, idx: number) => ({
      tempId: `staging_${idx}_${Date.now()}`,
      sku: row.SKU || row.Kod || row.sku || `SKU-${Math.random().toString(36).substr(2, 5)}`,
      name: row.Nazwa || row.name || "Brak nazwy",
      price: parseFloat(row.Cena || row.price || 0),
      stock: parseInt(row.Stan || row.stock || 0),
      manufacturer: row.Producent || row.manufacturer || "",
      categoryId: null,
      subcategoryId: null,
      xlsCategoryName: row.Kategoria || "",
      xlsSubcategoryName: row.Podkategoria || ""
    }));
    setStagingPayload(staging);
    setShowStaging(true);
  };

  const isItemConfirmed = (item: any) => !!(item.categoryId && item.name && item.sku);

  const handleCommitAll = () => {
    startTransition(async () => {
       const res = await importProductsAction(stagingPayload);
       if (res.success) {
         setImportSummary(res.message);
         setStagingPayload([]);
         toast.success(res.message);
       } else toast.error(res.error);
    });
  };

  // Handlers - Data Logic
  const handleDelete = (id: string) => {
    if (!confirm("Czy na pewno usunąć ten produkt?")) return;
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
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

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-[1600px] mx-auto pb-40">
       <ProductHeader 
          importing={isPending} 
          onImportClick={() => {}} // Controlled by WfMagUploadButton below
          onAddNew={() => toast.info("Formularz dodawania w przygotowaniu (Phase 2.1)")}
       />

       {/* Upload Trigger (hidden label logic handled here or in header) */}
       <div className="flex justify-start mb-8">
          <WfMagUploadButton onParsed={handleExcelParsed} disabled={isPending} />
       </div>

       {showStaging && stagingPayload.length > 0 && (
         <StagingDashboard 
            payload={stagingPayload}
            importing={isPending}
            onClear={() => { setStagingPayload([]); setShowStaging(false); }}
            onCommitAll={handleCommitAll}
            onUpdateItem={(tid, f, v) => setStagingPayload(prev => prev.map(i => i.tempId === tid ? { ...i, [f]: v } : i))}
            onCommitItem={(tid) => toast.info("Commit individual item in development")}
            onRemoveItem={(tid) => setStagingPayload(prev => prev.filter(i => i.tempId !== tid))}
            categories={categories}
            manufacturers={manufacturersList}
            isItemConfirmed={isItemConfirmed}
         />
       )}

       <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 items-start">
          <ProductSidebar 
             categories={categories}
             searchTerm={searchTerm} setSearchTerm={setSearchTerm}
             selectedCatId={selectedCatId} setSelectedCatId={setSelectedCatId}
             selectedSubcatId={selectedSubcatId} setSelectedSubcatId={setSelectedSubcatId}
             selectedManufacturer={selectedManufacturer} setSelectedManufacturer={setSelectedManufacturer}
             manufacturersList={manufacturersList}
          />
          <div className="xl:col-span-3">
             <ProductTable 
                products={paginatedProducts}
                onEdit={(p) => toast.info(`Edytuj ${p.sku}`)}
                onDelete={handleDelete}
                onGenerateAI={handleGenerateAI}
                generatingId={generatingId}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
             />
          </div>
       </div>
    </div>
  );
}
