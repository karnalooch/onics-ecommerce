// src/app/admin/products/ProductsDashboardClient.tsx
"use client";

import { useState, useMemo, useTransition, useEffect, useCallback } from "react";
import { ProductTable } from "./_components/ProductTable";
import { StagingDashboard } from "./_components/StagingDashboard";
import { AICommandCenter } from "./_components/AICommandCenter";
import { StructureApprovalModal } from "./_components/StructureApprovalModal";
import { toast } from "sonner";
import { useCatalogStore } from "@/store/catalogStore";
import { ShieldCheck } from "lucide-react";
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext";
import { useRouter } from "next/navigation";
import { IProduct, ICategory, IManufacturer, IStagingItem } from "./_lib/types";
import { processInventoryData } from "./_lib/inventoryLogic";

type KnowledgeSessionResult = {
  model?: unknown;
  name?: unknown;
  price?: unknown;
  manufacturer?: unknown;
  category?: unknown;
  subcategory?: unknown;
  specs?: unknown;
};

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

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/knowledge")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setKnowledgeSources(Array.isArray(data.sources) ? data.sources : []);
        setProcessedSources(
          Array.isArray(data.processedSources) ? data.processedSources : []
        );
        if (Array.isArray(data.registry?.categories)) {
          setLocalCategories(data.registry.categories);
        }
        if (Array.isArray(data.registry?.manufacturers)) {
          setLocalManufacturers(data.registry.manufacturers);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const manufacturersList = useMemo(
    () => localManufacturers.map((manufacturer) => manufacturer.name),
    [localManufacturers]
  );

  const refreshAllData = useCallback(async () => {
    router.refresh();
    const [resP, resC] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
    ]);
    if (resP.ok) setProducts(await resP.json());
    if (resC.ok) setLocalCategories(await resC.json());
  }, [router]);

  const handleProcessExcelData = useCallback(
    (data: Array<Record<string, unknown>>) => {
      const { staging, pendingStructure: ps } = processInventoryData(
        data,
        products,
        localCategories,
        localManufacturers
      );
      setStagingPayload(staging);
      if (
        ps.categories.length > 0 ||
        ps.subcategories.length > 0 ||
        ps.manufacturers.length > 0
      ) {
        setPendingStructure(ps);
        setIsStructureModalOpen(true);
      }
      toast.success(`Przetworzono ${staging.length} pozycji.`);
    },
    [
      localCategories,
      localManufacturers,
      products,
      setStagingPayload,
    ]
  );

  useEffect(() => {
    if (!isDone || !sessionResults || Object.keys(sessionResults).length === 0) {
      return;
    }

    const typedResults = sessionResults as Record<string, KnowledgeSessionResult>;
    const aiItems = Object.entries(typedResults).map(([sku, details]) => ({
      sku,
      name: String(details.model || details.name || sku),
      price: Number(details.price || 0),
      stock: 0,
      manufacturer: String(details.manufacturer || ""),
      xlsCategoryName: String(details.category || ""),
      xlsSubcategoryName: String(details.subcategory || ""),
      specs: String(details.specs || ""),
    }));

    const timer = window.setTimeout(() => {
      handleProcessExcelData(aiItems);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [handleProcessExcelData, isDone, sessionResults]);

  const readResponseError = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => ({}));
    return typeof payload?.error === "string" ? payload.error : fallback;
  };

  const commitStagingItems = (items: IStagingItem[]) => {
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

  const handleBatchUpdate = (
    ids: string[],
    field: keyof IStagingItem,
    value: unknown
  ) => {
    const selected = new Set(ids);
    setStagingPayload(
      stagingPayload.map((item) => {
        if (!selected.has(item.tempId)) return item;
        if (field === "categoryId" && item.categoryId !== value) {
          return { ...item, categoryId: value, subcategoryId: null };
        }
        return { ...item, [field]: value } as IStagingItem;
      })
    );
  };

  const isStagingItemConfirmed = (item: IStagingItem) => {
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

  const handleDeleteProduct = async (
    id: string,
    expectedRevision: number
  ) => {
    if (!window.confirm("Usunąć ten produkt z katalogu?")) return;

    try {
      const response = await fetch(
        `/api/products?id=${encodeURIComponent(id)}&expectedRevision=${encodeURIComponent(expectedRevision)}`,
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
        label: "Indeksy",
        value: products.length.toLocaleString("pl-PL"),
      },
      {
        label: "Sztuki na stanie",
        value: stockTotal.toLocaleString("pl-PL"),
      },
      {
        label: "Bez ceny",
        value: unpricedCount.toLocaleString("pl-PL"),
      },
      {
        label: "Do uzupełnienia",
        value: incompleteCount.toLocaleString("pl-PL"),
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
          <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] px-6 py-16 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-[var(--ops-muted)]" />
            <h3 className="mt-4 text-base font-semibold">Gotowy do importu</h3>
            <p className="mt-2 text-sm text-[var(--ops-muted)]">
              Wybierz plik Excel lub PDF, aby rozpocząć proces.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-5 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-muted)]">
            Rejestr techniczny
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Katalog
          </h1>
          <p className="mt-2 text-sm text-[var(--ops-muted)]">
            Produkty, klasyfikacja, ceny i stan magazynowy.
          </p>
        </div>
        <div className="font-mono text-sm text-[var(--ops-muted)]">
          {products.length.toLocaleString("pl-PL")} indeksów
        </div>
      </header>

      <dl className="grid overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] sm:grid-cols-2 xl:grid-cols-4">
        {catalogStats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-[var(--ops-border)] px-4 py-4 last:border-b-0 sm:border-r sm:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r xl:last:border-r-0"
          >
            <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--ops-muted)]">
              {stat.label}
            </dt>
            <dd className="mt-2 font-mono text-2xl font-semibold">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <main className="w-full min-w-0">
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
