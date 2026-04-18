// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition } from "react";
import { ProductHeader } from "./_components/ProductHeader";
import { ProductSidebar } from "./_components/ProductSidebar";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { WfMagUploadButton } from "./_components/WfMagUploadButton";
import { importProductsAction, deleteProductAction, generateAiDescriptionAction, saveProductAction, syncImportWithCatalogAction } from "./_actions";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";

export function ProductsDashboardClient({ initialProducts, categories }: { initialProducts: any[], categories: any[] }) {
  // 1. Data State
  const [products, setProducts] = useState(initialProducts);
  const [isPending, startTransition] = useTransition();

  // 1.1 Global State (Zustand) - Persistent Buffer (Bufor)
  const { 
    stagingPayload, 
    showStaging, 
    setStagingPayload, 
    setShowStaging, 
    updateStagingItem, 
    removeStagingItem, 
    clearStaging 
  } = useCatalogStore();

  // 2. Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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
    const staging = data.map((row: any, idx: number) => {
      // Robust field mapping for WF-Mag and other Excel variants
      const findField = (synonyms: string[]) => {
        const foundKey = Object.keys(row).find(k => {
          const lowerK = k.toLowerCase().trim();
          return synonyms.some(s => lowerK === s.toLowerCase() || lowerK.includes(s.toLowerCase()));
        });
        return foundKey ? row[foundKey] : undefined;
      };

      const rawName = findField(['Nazwa towaru', 'Nazwa', 'Produkt', 'Item Name', 'Name']);
      const rawSku = findField(['Indeks katalogowy', 'Kod', 'SKU', 'Symbol', 'Indeks', 'Artykuł', 'Model']);
      const rawPrice = findField(['Cena netto', 'Cena', 'Netto', 'Wartość', 'Price', 'Net']);
      const rawStock = findField(['Stan', 'Ilość', 'Stock', 'Quantity', 'Magazyn']);
      const rawMan = findField(['Producent', 'Manufacturer', 'Marka', 'Brand']);
      const rawCat = findField(['Kategoria', 'Dział', 'Category', 'Wydział']);
      const rawSub = findField(['Podkategoria', 'Subcategory', 'Podgrupa']);

      return {
        tempId: `staging_${idx}_${Date.now()}`,
        sku: rawSku || `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        name: rawName || "Brak nazwy",
        price: typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || 0).replace(/[^\d.,]/g, '').replace(',', '.')),
        stock: parseInt(String(rawStock || 0).replace(/[^\d]/g, '')),
        manufacturer: rawMan || "",
        categoryId: null,
        subcategoryId: null,
        xlsCategoryName: String(rawCat || ""),
        xlsSubcategoryName: String(rawSub || "")
      };
    });

    startTransition(async () => {
      const res = await syncImportWithCatalogAction(staging);
      if (res.success) {
        setStagingPayload(res.data);
        setShowStaging(true);
        toast.info(res.message);
      } else {
        setStagingPayload(staging);
        setShowStaging(true);
        toast.warning("Import wczytany bez synchronizacji cenników.");
      }
    });
  };

  const isItemConfirmed = (item: any) => !!(item.categoryId && item.name && item.sku);

  const handleCommitAll = () => {
    startTransition(async () => {
       const res = await importProductsAction(stagingPayload);
       if (res.success) {
         clearStaging();
         toast.success(res.message);
       } else toast.error(res.error);
    });
  };

  const handleCommitItem = (tempId: string) => {
    const item = stagingPayload.find(i => i.tempId === tempId);
    if (!item) return;

    startTransition(async () => {
      const res = await importProductsAction([item]);
      if (res.success) {
        removeStagingItem(tempId);
        toast.success(`Produkt ${item.sku} został zatwierdzony i zapisany.`);
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
          onImportClick={handleExcelParsed}
          onAddNew={() => toast.info("Formularz dodawania w przygotowaniu (Phase 2.1)")}
       />


       {showStaging && stagingPayload.length > 0 && (
         <StagingDashboard 
            payload={stagingPayload}
            importing={isPending}
            onClear={clearStaging}
            onCommitAll={handleCommitAll}
            onUpdateItem={updateStagingItem}
            onCommitItem={handleCommitItem}
            onRemoveItem={removeStagingItem}
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
