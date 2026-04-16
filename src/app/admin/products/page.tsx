"use client";

import { useEffect, useState, useRef, useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  PackageSearch, Plus, UploadCloud, Search, Edit2, ShieldAlert, Check, X, 
  AlertTriangle, Trash2, ArrowUpRight, ArrowDownRight, Sparkles, AlertCircle, RefreshCw,
  ChevronRight, ChevronDown, Filter, Info, Layers, Tag as TagIcon,
  ShoppingBag, HardDrive, BarChart3, Database, Save,
  ChevronLeft
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Staging Area
  const [stagingPayload, setStagingPayload] = useState<any[]>([]);

  // Edit State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Filtry
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedSubcatId, setSelectedSubcatId] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState("ALL");
  
  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importSummaryType, setImportSummaryType] = useState<'success' | 'error'>('success');
  const [stagingSearchQuery, setStagingSearchQuery] = useState("");
  
  // Staging logic for Zero Stock
  const [isZeroStockModalOpen, setIsZeroStockModalOpen] = useState(false);
  const [tempParsedData, setTempParsedData] = useState<any[]>([]);
  const [visibleStagingCount, setVisibleStagingCount] = useState(20);

  // UI State
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" })
      ]);
      const pData = await prodRes.json();
      const cData = await catRes.json();
      setProducts(pData);
      setCategories(cData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCatId, selectedSubcatId, selectedManufacturer, pageSize]);

  useEffect(() => {
    if (importSummary) {
      const timer = setTimeout(() => {
        setImportSummary(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [importSummary]);

  const handleGenerateAIDescription = async (productId: string) => {
    setGeneratingId(productId);
    try {
      const res = await fetch("/api/products/ai-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      const data = await res.json();
      if (data.success) {
        if (editingProduct?.id === productId) {
          setEditingProduct({ ...editingProduct, seoDescription: data.description });
        }
        setImportSummaryType('success');
        setImportSummary(`AI wygenerowało opis!`);
        await loadData(); // Odświeżamy dane w tabeli
      }
    } catch (e) {
      alert("Błąd generowania opisu AI.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct)
      });
      if (res.ok) {
        setIsEditOpen(false);
        await loadData();
      }
    } catch (e) {
      alert("Błąd podczas aktualizacji produktu.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Czy na pewno chcesz trwale usunąć ten produkt z bazy? Operacja jest nieodwracalna.")) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      alert("Błąd podczas usuwania produktu.");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCat = (id: string) => {
    const next = new Set(expandedCats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCats(next);
  };

  const handleWfMagImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      const suggestCategory = (prodName: string) => {
        const nameL = prodName.toLowerCase();
        let foundCatId = categories[0]?.id;
        let foundSubId = undefined;

        for (const cat of categories) {
          if (cat.subcategories) {
            for (const sub of cat.subcategories) {
              if (nameL.includes(sub.name.toLowerCase())) {
                return { categoryId: cat.id, subcategoryId: sub.id };
              }
            }
          }
        }

        if (nameL.includes('kamera') || nameL.includes('rejestrator') || nameL.includes('cctv') || nameL.includes('dvr') || nameL.includes('nvr') || nameL.includes('ip')) {
           foundCatId = categories.find(c => c.name.toLowerCase().includes('monitor'))?.id || foundCatId;
        } else if (nameL.includes('antena') || nameL.includes('konwerter') || nameL.includes('dekoder') || nameL.includes('sat')) {
           foundCatId = categories.find(c => c.name.toLowerCase().includes('tv-sat'))?.id || foundCatId;
        } else if (nameL.includes('router') || nameL.includes('switch') || nameL.includes('punkt') || nameL.includes('ap') || nameL.includes('lan')) {
           foundCatId = categories.find(c => c.name.toLowerCase().includes('lan'))?.id || foundCatId;
        } else if (nameL.includes('alarm') || nameL.includes('czujka') || nameL.includes('syrena') || nameL.includes('satel')) {
           foundCatId = categories.find(c => c.name.toLowerCase().includes('alarm'))?.id || foundCatId;
        }
        
        return { categoryId: foundCatId, subcategoryId: foundSubId };
      };

      const fileSkus = new Set();
      const parsedPayload = json.map((row: any) => {
        const getVal = (keys: string[]) => {
          const foundKey = Object.keys(row).find(k => keys.some(keyMatch => k.toLowerCase().includes(keyMatch)));
          return foundKey ? row[foundKey] : undefined;
        };

        const rawSku = getVal(["sku", "ean", "kod", "indeks", "symbol", "nr katalogowy", "indeks", "kod towaru", "kod produktu", "nr. kat", "model", "article no", "part number", "index"]);
        const name = String(getVal(["name", "nazwa", "produkt"]) || "Nieznany Produkt");
        const manufacturerRaw = String(getVal(["manufacturer", "producent", "marka"]) || "");
        const price = Number(getVal(["price", "cena", "netto"]) || 0);
        
        let isVirtualSku = false;
        let sku = String(rawSku && String(rawSku).trim() ? rawSku : "");
        
        if (!sku) {
           // Generujemy unikalne SKU dla nowych produktów bez kodu, aby uniknąć kolizji
           const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
           const cleanManuf = (manufacturerRaw || 'GEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
           const uniquePart = Math.random().toString(36).substring(2, 6).toUpperCase();
           sku = `V-${cleanManuf}-${cleanName}-${uniquePart}`;
           isVirtualSku = true;
        }
        const xlsCategoryName = String(getVal(["kategoria", "dział", "dzial", "grupa", "category", "group"]) || "").trim();
        const xlsSubcategoryName = String(getVal(["podkategoria", "subkategoria", "subcategory", "sub-category"]) || "").trim();
        
        const skuMatch = String(sku).trim().toLowerCase();
        const nameMatch = name.trim().toLowerCase();
        
        let existingProduct = products.find(p => String(p.sku || '').trim().toLowerCase() === skuMatch);
        let matchSource: 'sku' | 'name' | 'none' = existingProduct ? 'sku' : 'none';

        if (!existingProduct) {
          existingProduct = products.find(p => p.name.trim().toLowerCase() === nameMatch);
          if (existingProduct) matchSource = 'name';
        }

        let isDuplicateInFile = false;
        if (sku && sku !== "" && !sku.startsWith('V-')) {
          if (fileSkus.has(skuMatch)) {
            isDuplicateInFile = true;
          }
          fileSkus.add(skuMatch);
        }

        let priceDiff = 0;
        let isNew = !existingProduct;
        let categoryId = existingProduct?.categoryId;
        let subcategoryId = existingProduct?.subcategoryId;
        let aiSuggested = false;

        // Dopasowanie kategorii/podkategorii po nazwach z XLS
        let isNewCategory = false;
        let isNewSubcategory = false;
        
        if (xlsCategoryName) {
           const foundCat = categories.find(c => c.name.toLowerCase().trim() === xlsCategoryName.toLowerCase());
           if (foundCat) {
              categoryId = foundCat.id;
              if (xlsSubcategoryName) {
                 const foundSub = foundCat.subcategories?.find((s:any) => s.name.toLowerCase().trim() === xlsSubcategoryName.toLowerCase());
                 if (foundSub) {
                    subcategoryId = foundSub.id;
                 } else {
                    isNewSubcategory = true;
                 }
              }
           } else {
              isNewCategory = true;
              isNewSubcategory = !!xlsSubcategoryName;
           }
        }

        let manufacturer = existingProduct ? existingProduct.manufacturer : "";
        const xlsManufacturer = manufacturerRaw.trim();

        if (existingProduct) {
          priceDiff = price - existingProduct.price;
          // Sugerujemy kategorię tylko jeśli produkt już istnieje ale jej nie ma (uzupełnienie bazy)
          if (!existingProduct.categoryId && !categoryId) {
            const suggestion = suggestCategory(name);
            categoryId = suggestion.categoryId;
            subcategoryId = suggestion.subcategoryId;
            aiSuggested = true;
          }
        } else {
           // Dla zupełnie nowych produktów (nie ma w bazie) - NIE SUGERUJEMY AI (wymóg użytkownika)
           // Kategoria i Podkategoria zostają puste (chyba że były w XLS)
           // Marka zostaje pusta (chyba że była w XLS)
        }

        const tempId = `tmp-${sku}-${Math.random().toString(36).substr(2, 9)}`;

        return {
          tempId, sku, name, price,
          stock: Number(getVal(["stock", "stan", "ilość", "ilosc", "magazyn"]) || 0),
          manufacturer,
          categoryId, subcategoryId,
          xlsCategoryName, xlsSubcategoryName,
          isNewCategory, isNewSubcategory,
          isVirtualSku,
          matchSource,
          isDuplicateInFile,
          categoryLocked: !!existingProduct?.categoryId,
          seoDescription: existingProduct?.seoDescription || "",
          priceDiff, oldPrice: existingProduct?.price, aiSuggested,
          xlsManufacturer,
          isConfirmed: false
        };
      });

      const hasZeroStock = parsedPayload.some(item => item.stock === 0);
      if (hasZeroStock) {
        setTempParsedData(parsedPayload);
        setIsZeroStockModalOpen(true);
      } else {
        setStagingPayload(parsedPayload);
      }
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas analizy pliku Excel.");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleUpdateStagingItem = useCallback((tempId: string, field: string, value: any) => {
    setStagingPayload(prev => prev.map(item => {
       if (item.tempId === tempId) {
         const updated = { ...item, [field]: value };
         if (field === 'price') {
           const val = Number(value);
           updated.price = isNaN(val) ? 0 : val;
           updated.priceDiff = (!item.isNew && item.oldPrice !== undefined) ? (updated.price - item.oldPrice) : 0;
         }
         return updated;
       }
       return item;
    }));
  }, []);

  const commitSingleItemToDatabase = useCallback(async (tempId: string) => {
    const itemToCommit = stagingPayload.find(i => i.tempId === tempId);
    if (!itemToCommit) return;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "IMPORT_WFMAG", 
          items: [itemToCommit]
        })
      });
      const result = await res.json();
      if (result.success) {
        setStagingPayload(prev => prev.filter(i => i.tempId !== tempId));
        setImportSummaryType('success');
        setImportSummary(`Sukces! Zaktualizowano: ${result.updatedCount}, Dodano: ${result.addedCount}`);
        await loadData();
      } else {
        alert("Błąd serwera: Nie udało się dodać produktu.");
      }
    } catch (e) {
      alert("Błąd zapisu.");
      setStagingPayload(prev => [itemToCommit, ...prev]);
    }
  }, [stagingPayload, loadData]);

  const commitAllStagingToDatabase = async () => {
    if (stagingPayload.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IMPORT_WFMAG", items: stagingPayload })
      });
      const result = await res.json();
      if (result.success) {
        setImportSummaryType('success');
        setImportSummary(`Masowy import zakończony! Zaktualizowano: ${result.updatedCount}, Dodano: ${result.addedCount}`);
        setStagingPayload([]);
        await loadData();
      }
    } catch (e) {
      alert("Błąd masowego zapisu.");
    } finally {
      setImporting(false);
    }
  };

  // --- FILTROWANIE (OPTIMIZED) ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = String(p.name).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.sku).toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !selectedCatId || p.categoryId === selectedCatId;
      const matchSub = !selectedSubcatId || p.subcategoryId === selectedSubcatId;
      const matchManuf = selectedManufacturer === "ALL" || p.manufacturer === selectedManufacturer;
      return matchSearch && matchCat && matchSub && matchManuf;
    });
  }, [products, searchTerm, selectedCatId, selectedSubcatId, selectedManufacturer]);

  const totalPages = useMemo(() => Math.ceil(filteredProducts.length / pageSize), [filteredProducts.length, pageSize]);
  
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredProducts, currentPage, pageSize]);

  const manufacturersList = useMemo(() => Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))), [products]);

  const filteredStagingPayload = useMemo(() => {
    if (!stagingSearchQuery.trim()) return stagingPayload;
    const q = stagingSearchQuery.toLowerCase();
    return stagingPayload.filter(item => 
      item.sku?.toLowerCase().includes(q) || 
      item.name?.toLowerCase().includes(q) || 
      item.manufacturer?.toLowerCase().includes(q)
    );
  }, [stagingPayload, stagingSearchQuery]);

  const getSubcategories = useCallback((catId?: string) => {
    if (!catId) return [];
    return categories.find(c => c.id === catId)?.subcategories || [];
  }, [categories]);

  const getCatName = useCallback((id: string) => categories.find(c => c.id === id)?.name || "Kat.", [categories]);

  const getSubName = useCallback((catId: string, subId?: string) => {
    if (!subId) return null;
    return categories.find(c => c.id === catId)?.subcategories?.find((s: any) => s.id === subId)?.name || null;
  }, [categories]);

  const isItemConfirmed = useCallback((item: any) => {
    const hasName = !!item.name?.trim() && item.name !== "Nieznany Produkt" && item.name.trim().length > 3;
    const hasCat = !!item.categoryId || (item.isNewCategory && !!item.xlsCategoryName?.trim());
    const hasSub = !!item.subcategoryId || (item.isNewSubcategory && !!item.xlsSubcategoryName?.trim());
    const hasManuf = item.isNewManufacturer 
      ? (!!item.manufacturer?.trim() && item.manufacturer.trim().length >= 2)
      : (!!item.manufacturer?.trim() && item.manufacturer !== "Inny" && manufacturersList.includes(item.manufacturer));
    return hasName && hasCat && hasSub && hasManuf;
  }, [manufacturersList]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
           <div className="space-y-2">
             <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
               <ShoppingBag className="w-10 h-10 text-primary" /> Baza Produktów
             </h1>
             <p className="text-slate-500 font-medium max-w-xl">
               Zarządzaj centralną bazą towarową. Zaawansowane filtrowanie, dynamiczny import z WF-Mag i ochrona opisów SEO.
             </p>
           </div>
           
           <div className="flex gap-3">
             <input type="file" accept=".xls,.xlsx,.csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
             <Button 
                onClick={handleWfMagImportClick}
                disabled={importing}
                className="h-12 px-6 rounded-2xl bg-white text-slate-900 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-bold shadow-sm transition-all flex gap-2"
             >
                <UploadCloud className="w-5 h-5 text-primary" />
                {importing ? "Mielenie..." : "Importuj z WF-Mag"}
             </Button>
             <Button className="h-12 px-8 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all flex gap-2">
                <Plus className="w-5 h-5 text-white" />
                Dodaj Nowy
             </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">
          
          {/* SIDEBAR FILTERS */}
          <div className="lg:col-span-3 space-y-6 sticky top-8">
             <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px] overflow-hidden">
               <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
                 <CardTitle className="text-lg flex items-center gap-2">
                   <Filter className="w-5 h-5 text-primary" /> Przeglądaj Katalog
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6 space-y-8">
                 
                 {/* Search */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Wyszukaj produkt</label>
                    <div className="relative group">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-primary" />
                       <input 
                         type="text" 
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                         placeholder="Model, Indeks, Nazwa..."
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary/20 text-sm font-semibold transition-all"
                       />
                    </div>
                 </div>

                 {/* Categories Hierarchy */}
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Hierarchia Kategorii</label>
                    <div className="space-y-1">
                       <button 
                         onClick={() => { setSelectedCatId(null); setSelectedSubcatId(null); }}
                         className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedCatId ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
                       >
                         <Layers className="w-4 h-4" /> Wszystkie Produkty
                       </button>

                       {categories.map(cat => (
                         <div key={cat.id} className="space-y-1">
                            <div className="flex items-center gap-1">
                               <button 
                                 onClick={() => {
                                   setSelectedCatId(cat.id);
                                   setSelectedSubcatId(null);
                                   toggleCat(cat.id);
                                 }}
                                 className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedCatId === cat.id && !selectedSubcatId ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                               >
                                 <span className="flex items-center gap-2">
                                    <TagIcon className="w-3.5 h-3.5" /> {cat.name}
                                 </span>
                                 {cat.subcategories?.length > 0 && (
                                   expandedCats.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                 )}
                               </button>
                            </div>

                            {expandedCats.has(cat.id) && cat.subcategories?.length > 0 && (
                              <div className="ml-6 space-y-1 border-l-2 border-slate-100 pl-2 py-1 animate-in slide-in-from-left duration-300">
                                {cat.subcategories.map((sub: any) => (
                                  <button
                                    key={sub.id}
                                    onClick={() => {
                                      setSelectedCatId(cat.id);
                                      setSelectedSubcatId(sub.id);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedSubcatId === sub.id ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                                  >
                                    {sub.name}
                                  </button>
                                ))}
                              </div>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Manufacturer */}
                 <div className="space-y-3 pt-4 border-t">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Producent</label>
                    <select 
                      value={selectedManufacturer}
                      onChange={e => setSelectedManufacturer(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none text-sm font-bold text-slate-600"
                    >
                      <option value="ALL">Wszyscy Producenci</option>
                      {manufacturersList.map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
                    </select>
                 </div>
               </CardContent>
             </Card>

             <Card className="border-none shadow-lg shadow-blue-100/50 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                <CardContent className="p-6 space-y-4">
                   <div className="p-3 bg-white/20 rounded-2xl w-fit">
                      <Sparkles className="w-6 h-6 text-yellow-300" />
                   </div>
                   <h3 className="font-black text-xl leading-tight">Inteligentna Klasyfikacja</h3>
                   <p className="text-white/80 text-xs font-medium leading-relaxed">
                     System automatycznie dopasowuje nowo zaimportowane produkty do Twojej struktury kategorii. 
                   </p>
                </CardContent>
             </Card>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="lg:col-span-9 space-y-10">
            
            {/* STAGING OVERLAY / TOP CARD */}
            {stagingPayload.length > 0 && (
              <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 p-8 rounded-[40px] bg-orange-50/50 border-4 border-orange-200 shadow-2xl shadow-orange-200/50">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-4">
                     <div className="p-4 bg-orange-500 text-white rounded-[20px] shadow-lg shadow-orange-500/20">
                        <ArrowUpRight className="w-8 h-8" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-black text-orange-900">Biurko Klasyfikacyjne</h2>
                       <p className="text-orange-700/70 font-bold text-sm">Automatycznie zatwierdzono {stagingPayload.filter(isItemConfirmed).length} z {stagingPayload.length} zmian.</p>
                     </div>
                   </div>

                   <div className="flex-1 max-w-sm ml-8">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                        <input 
                           placeholder="Szukaj w biurku (SKU, Nazwa, Marka)..."
                           className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border-2 border-orange-100 focus:border-orange-500 outline-none text-xs font-bold transition-all"
                           value={stagingSearchQuery}
                           onChange={(e) => setStagingSearchQuery(e.target.value)}
                        />
                     </div>
                   </div>

                   <div className="flex gap-4 items-center">
                        {importSummary && (
                          <div className={`px-4 py-2 rounded-xl text-xs font-black animate-in fade-in zoom-in duration-300 ${
                            importSummaryType === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {importSummary}
                          </div>
                        )}
                       <Button 
                         variant="ghost" 
                         onClick={() => { setStagingPayload([]); setImportSummary(null); }} 
                         className="h-12 px-6 rounded-2xl text-red-600 hover:bg-red-50 hover:text-red-700 font-bold border-2 border-transparent hover:border-red-200 transition-all"
                       >
                         Wyczyść i wróć
                       </Button>
                       <Button 
                          onClick={commitAllStagingToDatabase} 
                          disabled={importing || stagingPayload.some(item => !isItemConfirmed(item))} 
                          className={`h-12 px-8 rounded-2xl font-black shadow-lg transition-all ${
                             stagingPayload.some(item => !isItemConfirmed(item)) 
                             ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                             : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
                          }`}
                        >
                          {importing ? "Mielenie..." : "Zatwierdź Wszystko"}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-200">
                   <AnimatePresence mode="popLayout">
                      {filteredStagingPayload.slice(0, visibleStagingCount).map(item => (
                        <StagingItem 
                           key={item.tempId}
                           item={item}
                           categories={categories}
                           manufacturers={manufacturersList}
                           onUpdate={handleUpdateStagingItem}
                           onCommit={commitSingleItemToDatabase}
                           onRemove={(id: string, sku: string) => {
                              setStagingPayload(p => p.filter(i => i.tempId !== id));
                              setImportSummaryType('error');
                              setImportSummary(`Pozycja ${sku} została usunięta z listy.`);
                           }}
                           getSubcategories={getSubcategories}
                           isItemConfirmed={isItemConfirmed}
                        />
                      ))}
                   </AnimatePresence>

                   {visibleStagingCount < filteredStagingPayload.length && (
                      <div className="pt-8 pb-4 flex justify-center">
                         <Button 
                           onClick={() => setVisibleStagingCount(prev => prev + 50)}
                           variant="outline"
                           className="h-14 px-10 rounded-2xl border-2 border-orange-200 text-orange-700 font-black hover:bg-orange-100 hover:border-orange-300 transition-all flex gap-3 shadow-lg shadow-orange-200/50"
                         >
                           <ChevronDown className="w-6 h-6 animate-bounce" />
                           Pokaż więcej produktów (zostało {filteredStagingPayload.length - visibleStagingCount})
                         </Button>
                      </div>
                   )}
                </div>
              </div>
            )}

            {/* PRODUCT LIST SECTION */}
            <div className="space-y-6">
               <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Wyniki: <span className="text-slate-900">{filteredProducts.length}</span>
                    </div>
                    
                    {/* Page Size Selector */}
                    <div className="hidden sm:flex items-center gap-1.5 ml-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                       {[10, 20, 50].map(size => (
                         <button 
                           key={size}
                           onClick={() => setPageSize(size)}
                           className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${pageSize === size ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                         >
                           {size}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                     {/* MINI PAGINATION FOR HEADER */}
                     {totalPages > 1 && (
                        <div className="flex items-center gap-2 mr-4 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                           <Button 
                             variant="ghost" 
                             size="icon"
                             disabled={currentPage === 1}
                             onClick={() => setCurrentPage(prev => prev - 1)}
                             className="w-8 h-8 rounded-lg disabled:opacity-20"
                           >
                             <ChevronLeft className="w-4 h-4" />
                           </Button>
                           <span className="text-[10px] font-black text-slate-600 px-1">
                             {currentPage} / {totalPages}
                           </span>
                           <Button 
                             variant="ghost" 
                             size="icon"
                             disabled={currentPage === totalPages}
                             onClick={() => setCurrentPage(prev => prev + 1)}
                             className="w-8 h-8 rounded-lg disabled:opacity-20"
                           >
                             <ChevronRight className="w-4 h-4" />
                           </Button>
                        </div>
                     )}

                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sortuj:</span>
                        <select className="bg-white border-none text-[10px] font-black p-2 rounded-xl outline-none shadow-sm cursor-pointer hover:bg-slate-50">
                           <option>Najnowsze</option>
                           <option>Cena: Rosnąco</option>
                           <option>Cena: Malejąco</option>
                           <option>Stan: Najwięcej</option>
                        </select>
                     </div>
                  </div>
               </div>

               {loading ? (
                  <div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-400">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg"></div>
                    <span className="font-bold tracking-widest uppercase text-xs">Synchronizacja bazy...</span>
                  </div>
               ) : filteredProducts.length === 0 ? (
                  <div className="py-40 bg-white rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-12">
                     <PackageSearch className="w-20 h-20 text-slate-200 mb-6" />
                     <h3 className="text-xl font-black text-slate-900 mb-2">Brak produktów</h3>
                     <p className="text-slate-500 font-medium max-w-sm">Zmień filtry lub zaimportuj nowe towary, aby zasilić bazę.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {paginatedProducts.map(p => (
                       <div key={p.id} className="group relative flex flex-col md:flex-row items-center gap-6 p-6 bg-white rounded-[40px] hover:shadow-2xl hover:shadow-slate-200/80 transition-all duration-500 border border-slate-100 hover:border-primary/20">
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0 space-y-3">
                             <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-black text-[10px] border-slate-200 text-slate-500">{p.sku}</Badge>
                                <span className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1">|</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${p.stock > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {p.stock > 0 ? 'W Magazynie' : 'Wyprzedane'}
                                </span>
                             </div>
                             
                             <h3 className="text-xl font-black text-slate-800 group-hover:text-primary transition-colors leading-tight truncate">
                               {p.name}
                             </h3>

                             <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2">
                                   <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                      <TagIcon className="w-3 h-3" />
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Kategoria</span>
                                      <span className="text-xs font-black text-slate-600 leading-none">{getCatName(p.categoryId)}</span>
                                   </div>
                                </div>
                                {p.subcategoryId && (
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Podkategoria</span>
                                     <span className="text-xs font-bold text-slate-400 leading-none bg-slate-50 px-2 py-0.5 rounded italic">
                                       {getSubName(p.categoryId, p.subcategoryId)}
                                     </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                   <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                                      <HardDrive className="w-3 h-3" />
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Producent</span>
                                      <span className="text-xs font-black text-slate-600 leading-none">{p.manufacturer || "Inny"}</span>
                                   </div>
                                </div>
                             </div>

                             {p.seoDescription && (
                                <div className="mt-4 p-3 bg-blue-50/30 rounded-2xl border border-blue-100/30">
                                   <div className="flex items-center gap-2 mb-1.5">
                                      <Sparkles className="w-3 h-3 text-blue-500" />
                                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Opis AI (SEO)</span>
                                   </div>
                                   <p className="text-xs font-medium text-slate-500 italic leading-relaxed line-clamp-2">
                                     "{p.seoDescription}"
                                   </p>
                                </div>
                              )}
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center gap-8 pl-8 md:border-l border-slate-100">
                             <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Cena Netto</span>
                                <div className="flex items-baseline gap-1">
                                   <span className="text-3xl font-black text-slate-900">{Number(p.price).toFixed(2)}</span>
                                   <span className="text-sm font-bold text-slate-400">PLN</span>
                 <div className="text-[10px] font-bold text-slate-300 mt-1">Brutto: {(p.price * 1.23).toFixed(2)} PLN</div>
                             </div>

                             <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                                <Button 
                                  size="icon" 
                                  onClick={() => {
                                    setEditingProduct({ ...p });
                                    setIsEditOpen(true);
                                  }}
                                  className="w-12 h-12 rounded-[22px] bg-slate-900 hover:bg-primary text-white shadow-xl shadow-slate-900/10 hover:shadow-primary/30 transition-all"
                                >
                                   <Edit2 className="w-5 h-5" />
                                </Button>
                                <Button 
                                   size="icon" 
                                   disabled={generatingId === p.id}
                                   onClick={() => handleGenerateAIDescription(p.id)}
                                   className={`w-12 h-12 rounded-[22px] ${generatingId === p.id ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-blue-50 border-2 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white shadow-xl shadow-blue-100/50 hover:shadow-blue-600/30'} transition-all font-bold`}
                                   title="Generuj opis SEO za pomocą AI"
                                 >
                                    {generatingId === p.id ? <Sparkles className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                 </Button>
                                <Button 
                                  size="icon" 
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="w-12 h-12 rounded-[22px] bg-red-50 border-2 border-red-100 text-red-600 hover:bg-red-600 hover:text-white shadow-xl shadow-red-100/50 hover:shadow-red-600/30 transition-all font-bold"
                                >
                                   <Trash2 className="w-5 h-5" />
                                </Button>
                             </div>
                                {p.seoDescription && (
                                  <div className="absolute -top-3 -right-3" title="Zawiera dedykowany opis SEO">
                                     <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg animate-pulse">
                                        <ShieldAlert className="w-4 h-4" />
                                     </div>
                                  </div>
                                )}
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl rounded-[32px] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <Edit2 className="w-6 h-6 text-primary" /> Edytuj Produkt
            </DialogTitle>
            <DialogDescription className="font-medium">
               Modyfikacja danych produktu w centralnej bazie CMS. SKU: <span className="font-bold text-slate-800">{editingProduct?.sku}</span>
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="grid grid-cols-2 gap-6 my-6">
               <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nazwa Urządzenia</label>
                  <input 
                    className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-800"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Cena Netto (PLN)</label>
                  <input 
                    type="number"
                    className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-primary"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Stan Magazynowy</label>
                  <input 
                    type="number"
                    className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-600"
                    value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  />
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Kategoria</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-600"
                    value={editingProduct.categoryId}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value, subcategoryId: '' })}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Podkategoria</label>
                  <select 
                    className="w-full p-3 bg-slate-50 rounded-2xl border-none outline-none font-bold text-slate-600"
                    value={editingProduct.subcategoryId || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, subcategoryId: e.target.value })}
                  >
                    <option value="">Brak / Główna</option>
                    {getSubcategories(editingProduct.categoryId).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>

               <div className="col-span-2 space-y-2">
                   <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-slate-400">Opis SEO (Chroniony przed WF-Mag)</label>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        disabled={generatingId === editingProduct.id}
                        onClick={() => handleGenerateAIDescription(editingProduct.id)}
                        className="text-[10px] font-black uppercase text-primary hover:bg-primary/5 gap-2 h-7"
                      >
                         <Sparkles className={`w-3 h-3 ${generatingId === editingProduct.id ? 'animate-spin' : ''}`} />
                         {generatingId === editingProduct.id ? 'Magia w toku...' : 'Generuj Magią AI'}
                      </Button>
                   </div>
                   <textarea 
                     className="w-full p-4 bg-blue-50/50 rounded-2xl border-none outline-none text-sm font-medium text-blue-900 min-h-[120px] transition-all focus:ring-2 focus:ring-primary/20"
                     value={editingProduct.seoDescription || ''}
                     onChange={e => setEditingProduct({ ...editingProduct, seoDescription: e.target.value })}
                     placeholder="Wpisz treść HTML opisującą produkt..."
                   />
                </div>
            </div>
          )}

          <DialogFooter className="gap-3">
             <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-2xl font-bold">Anuluj</Button>
             <Button onClick={handleUpdateProduct} className="rounded-2xl bg-primary px-8 font-black shadow-lg shadow-primary/20 flex gap-2">
                <Save className="w-4 h-4" /> Zapisz Zmiany
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ZERO STOCK PROMPT */}
      <Dialog open={isZeroStockModalOpen} onOpenChange={setIsZeroStockModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
               <AlertTriangle className="w-8 h-8 text-amber-500" /> Wykryto braki
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-600">
               W importowanym pliku znajdują się produkty z zerowym stanem magazynowym. Jak chcesz postąpić?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 my-4">
             <Button 
               onClick={() => {
                 setStagingPayload(tempParsedData);
                 setIsZeroStockModalOpen(false);
               }}
               className="h-14 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all justify-start px-6 gap-4"
             >
                <div className="p-2 bg-white/10 rounded-lg"><Check className="w-4 h-4" /></div>
                <div className="flex flex-col items-start leading-tight">
                   <span>Importuj wszystko</span>
                   <span className="text-[10px] opacity-50 font-medium text-left">Wszystkie wiersze trafią do poczekalni</span>
                </div>
             </Button>
             
             <Button 
               variant="outline"
               onClick={() => {
                 setStagingPayload(tempParsedData.filter(item => item.stock > 0));
                 setIsZeroStockModalOpen(false);
               }}
               className="h-14 rounded-2xl border-2 border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-all justify-start px-6 gap-4"
             >
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><X className="w-4 h-4" /></div>
                <div className="flex flex-col items-start leading-tight">
                   <span>Pomiń produkty ze stanem 0</span>
                   <span className="text-[10px] text-slate-400 font-medium text-left">Filtruje tylko dostępne towary</span>
                </div>
             </Button>
          </div>

          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsZeroStockModalOpen(false)} className="w-full rounded-xl text-slate-400 hover:text-slate-600">Anuluj import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StagingItem = memo(({ item, categories, onUpdate, onCommit, onRemove, getSubcategories, manufacturers, isItemConfirmed }: any) => {
  // Local state for fields that suffer from typing lag
  const [localName, setLocalName] = useState(item.name);
  const [localPrice, setLocalPrice] = useState(item.price);
  const [localManuf, setLocalManuf] = useState(item.manufacturer || '');
  const [localXlsCat, setLocalXlsCat] = useState(item.xlsCategoryName || '');
  const [localXlsSub, setLocalXlsSub] = useState(item.xlsSubcategoryName || '');
  const [isNewCatActive, setIsNewCatActive] = useState(item.isNewCategory);
  const [isNewSubActive, setIsNewSubActive] = useState(item.isNewSubcategory);
  const [isNewManufActive, setIsNewManufActive] = useState(item.isNewManufacturer || false);

  // Synchronize local state with prop changes
  useEffect(() => {
    setLocalXlsSub(item.xlsSubcategoryName || '');
  }, [item.name, item.price, item.manufacturer, item.xlsCategoryName, item.xlsSubcategoryName]);

  const handleBlur = (field: string, value: any) => {
    if (item[field] !== value) {
      onUpdate(item.tempId, field, value);
    }
  };

  const handleUpdate = (field: string, value: any) => {
     onUpdate(item.tempId, field, value);
  };

  // Automatyczne zatwierdzenie
  const isConfirmedAuto = useMemo(() => isItemConfirmed(item), [item, isItemConfirmed]);

  let diffBg = "border-gray-200";
  let statusText = "Aktualizacja";
  if (item.isNew) {
    diffBg = "border-blue-400 bg-blue-50/20";
    statusText = "Nowy Produkt";
  } else if (item.priceDiff > 0) {
    diffBg = "border-emerald-500 bg-emerald-50/20";
    statusText = `Wzrost: +${item.priceDiff.toFixed(2)}`;
  } else if (item.priceDiff < 0) {
    diffBg = "border-red-500 bg-red-50/20";
    statusText = `Obniżka: ${item.priceDiff.toFixed(2)}`;
  }

  return (
    <motion.div 
       initial={{ opacity: 0, y: 10 }} 
       animate={{ opacity: 1, y: 0 }} 
       exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }} 
       className={`flex flex-col md:flex-row gap-6 p-5 border-2 rounded-3xl transition-all shadow-sm bg-white ${isConfirmedAuto ? 'border-emerald-500 shadow-emerald-100 shadow-lg' : diffBg}`}
    >
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
           <Badge className={item.isNew ? 'bg-blue-600' : 'bg-slate-600'}>{item.sku}</Badge>
           {item.matchSource === 'name' && (
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Znaleziono po NAZWIE</div>
           )}
           {item.isVirtualSku && (
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Wirtualne SKU</div>
           )}
           <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-auto">
              <Database className="w-3 h-3" /> Status WF-Mag: <span className={item.isNew ? 'text-blue-600' : 'text-emerald-600'}>{statusText}</span>
           </div>
           
           <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => onRemove(item.tempId, item.sku)} className="rounded-full w-8 h-8 text-red-500 hover:bg-red-50">
                 <Trash2 className="w-4 h-4" />
              </Button>
              
              <Button 
                 size="icon" 
                 disabled={!isConfirmedAuto}
                 onClick={() => onCommit(item.tempId)} 
                 className={`rounded-full w-10 h-10 text-white shadow-lg transition-all duration-300 ${
                   !isConfirmedAuto 
                   ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                   : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-110 active:scale-95'
                 }`}
              >
                 {isConfirmedAuto ? (
                    <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                 ) : (
                    <AlertCircle className="w-5 h-5" />
                 )}
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-muted-foreground/60 uppercase">Nazwa Produktu (B2B)</label>
              <input className="w-full text-lg font-bold text-slate-800 border-b-2 border-transparent focus:border-primary outline-none bg-transparent transition-all" value={localName} onChange={(e) => setLocalName(e.target.value)} onBlur={(e) => handleBlur('name', e.target.value)} />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground/60 uppercase">Cena Netto</label>
                 <input type="number" className="w-full text-lg font-black text-primary border-b-2 border-transparent focus:border-primary outline-none bg-transparent" value={localPrice} onChange={(e) => setLocalPrice(e.target.value)} onBlur={(e) => handleBlur('price', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground/60 uppercase">Stan</label>
                <div className="text-lg font-black text-slate-500">{item.stock} <span className="text-xs font-normal opacity-50">szt.</span></div>
              </div>
           </div>
        </div>

         <div className="grid grid-cols-3 gap-4 pt-2 border-t border-dashed items-end">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Kategoria</span>
                <Button variant="ghost" className="h-5 w-5 p-0 hover:bg-slate-100 rounded-full" onClick={() => { setIsNewCatActive(!isNewCatActive); handleUpdate('isNewCategory', !isNewCatActive); }}>
                   {isNewCatActive ? <TagIcon className="w-3 h-3 text-emerald-600"/> : <Plus className="w-3 h-3 text-slate-400"/>}
                </Button>
              </div>
              {isNewCatActive ? (
                <input className={`text-xs p-1.5 rounded-lg border font-bold outline-none transition-all ${!item.xlsCategoryName?.trim() ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`} value={localXlsCat} onChange={(e) => setLocalXlsCat(e.target.value)} onBlur={(e) => handleBlur('xlsCategoryName', e.target.value)} placeholder="Wpisz nową..." />
              ) : (
                <select className={`text-xs p-1.5 rounded-lg border-2 font-semibold outline-none transition-all ${!item.categoryId ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-900'}`} value={item.categoryId || ''} onChange={(e) => { handleUpdate('categoryId', e.target.value); handleUpdate('subcategoryId', ''); onUpdate(item.tempId, 'isNewCategory', false); }}>
                  <option value="">Wybierz...</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Podkategoria</span>
                <Button variant="ghost" className="h-5 w-5 p-0 hover:bg-slate-100 rounded-full" onClick={() => { setIsNewSubActive(!isNewSubActive); handleUpdate('isNewSubcategory', !isNewSubActive); }}>
                   {isNewSubActive ? <TagIcon className="w-3 h-3 text-emerald-600"/> : <Plus className="w-3 h-3 text-slate-400"/>}
                </Button>
              </div>
              {isNewSubActive ? (
                 <input className={`text-xs p-1.5 rounded-lg border font-bold outline-none transition-all ${!item.xlsSubcategoryName?.trim() ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`} value={localXlsSub} onChange={(e) => setLocalXlsSub(e.target.value)} onBlur={(e) => handleBlur('xlsSubcategoryName', e.target.value)} placeholder="Wpisz nową..." />
              ) : (
                <select className={`text-xs p-1.5 rounded-lg border-2 font-semibold outline-none transition-all ${(!item.subcategoryId && !item.isNewSubcategory) ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-900'}`} value={item.subcategoryId || ''} onChange={(e) => { handleUpdate('subcategoryId', e.target.value); onUpdate(item.tempId, 'isNewSubcategory', false); }}>
                  <option value="">Wybierz...</option>
                  {getSubcategories(item.categoryId).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Marka / Producent</span>
                 <Button variant="ghost" className="h-5 w-5 p-0 hover:bg-slate-100 rounded-full" onClick={() => { setIsNewManufActive(!isNewManufActive); handleUpdate('isNewManufacturer', !isNewManufActive); }}>
                    {isNewManufActive ? <TagIcon className="w-3 h-3 text-emerald-600"/> : <Plus className="w-3 h-3 text-slate-400"/>}
                 </Button>
              </div>
              {isNewManufActive ? (
                 <input className={`text-xs p-1.5 rounded-lg border font-bold outline-none transition-all ${!item.manufacturer?.trim() ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`} value={localManuf} onChange={(e) => setLocalManuf(e.target.value)} onBlur={(e) => handleBlur('manufacturer', e.target.value)} placeholder="Wpisz nową markę..." />
              ) : (
                <select className={`text-xs p-1.5 rounded-lg border-2 font-semibold outline-none transition-all ${(!item.manufacturer || !manufacturers.includes(item.manufacturer)) ? 'bg-red-50 border-red-200 text-red-900 animate-pulse-subtle' : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-900'}`} value={item.manufacturer || ''} onChange={(e) => { handleUpdate('manufacturer', e.target.value); onUpdate(item.tempId, 'isNewManufacturer', false); }}>
                  <option value="">Wybierz...</option>
                  {/* Jeśli mamy markę z pliku, pokazujemy ją jako propozycję, ale nie wybraną domyślnie */}
                  {item.xlsManufacturer && !manufacturers.includes(item.xlsManufacturer) && (
                     <option value={item.xlsManufacturer}>{item.xlsManufacturer} (z pliku)</option>
                  )}
                  {manufacturers.map((m: any) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </div>
         </div>
      </div>
    </motion.div>
  );
});
