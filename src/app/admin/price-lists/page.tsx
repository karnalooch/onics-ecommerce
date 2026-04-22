"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { 
  Printer, Filter, Tag, Search, 
  CheckCircle2, FileSpreadsheet, Download, RefreshCw,
  ChevronRight, Info, Database, Eye, EyeOff, LayoutDashboard,
  Percent, ArrowDownNarrowWide, Smartphone, Monitor, HardDrive, Bell,
  Terminal, ShieldCheck, Activity, Zap, Box, LayoutGrid
} from "lucide-react"
import * as Icons from "lucide-react"
import * as XLSX from "xlsx"
import { calculateB2BPrice, PRICING_MATRIX } from "./_lib/priceLogic"
import { toast } from "sonner"

const VAT_RATE = 0.23;

export default function PricelistGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sortByManufacturer, setSortByManufacturer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTier, setSelectedTier] = useState("PARTNER");
  const [isWhiteLabel, setIsWhiteLabel] = useState(false);
  const [customMarkup, setCustomMarkup] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products")
      ]);
      const [cats, prods] = await Promise.all([cRes.json(), pRes.json()]);
      setCategories(cats);
      setProducts(prods);
      setSelectedCategoryIds(cats.map((c: any) => c.id));
    } catch (e) {
      toast.error("FAULT: Błąd synchronizacji matrycy cenowej.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(c => c !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  }

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => 
      selectedCategoryIds.includes(p.categoryId) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortByManufacturer) {
      result.sort((a, b) => (a.manufacturer || "").localeCompare(b.manufacturer || ""));
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, selectedCategoryIds, sortByManufacturer, searchQuery]);

  const handlePrint = () => {
    window.print();
  }

  const getIcon = (name: string, className = "h-4 w-4") => {
    const IconComp = (Icons as any)[name] || Icons.Folder;
    return <IconComp className={className} />;
  };

  const handleExportExcel = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        const exportData = filteredProducts.map(p => {
          const b2b = calculateB2BPrice(p, selectedTier);
          const finalNetto = b2b.price * (1 + customMarkup / 100);
          return {
            "Kod Produktu": p.sku,
            "Producent": p.manufacturer || "Inny",
            "Nazwa": p.name,
            "Cena Katalogowa": p.price,
            "Rabat B2B (%)": b2b.discount,
            "Twoja Cena Netto": b2b.price,
            "Narzut (%)": customMarkup,
            "Cena Końcowa Netto": parseFloat(finalNetto.toFixed(2)),
            "Cena Brutto (23%)": parseFloat((finalNetto * 1.23).toFixed(2))
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cennik_Eksport");
        XLSX.writeFile(wb, `Celtronics_Matrix_${selectedTier}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("LOG: Eksport XLSX zakończony pomyślnie.");
      } catch (e) {
        toast.error("FAULT: Błąd generowania pliku XLSX.");
      } finally {
        setExporting(false);
      }
    }, 800);
  }

  const PricelistTable = ({ products }: { products: any[] }) => (
    <div className="flex flex-col bg-white border border-slate-100 mt-2">
      <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 tabular-nums italic">
        <div className="col-span-2">SYMBOL_ID</div>
        <div className="col-span-4">SPECYFIKACJA_URZĄDZENIA</div>
        <div className="col-span-2">PRODUCENT</div>
        <div className="col-span-2 text-right">VAL_NET</div>
        <div className="col-span-2 text-right">VAL_GROSS</div>
      </div>
      <div className="divide-y divide-slate-50">
        {products.map((p) => {
          const b2b = calculateB2BPrice(p, selectedTier);
          const priceNetto = b2b.price * (1 + customMarkup / 100);
          const priceGross = priceNetto * (1 + VAT_RATE);
          return (
            <div key={p.id} className="grid grid-cols-12 gap-4 px-5 py-3 text-[10px] items-center hover:bg-slate-50 transition-colors font-mono group">
              <div className="col-span-2 font-black text-primary truncate tracking-tighter italic">{p.sku}</div>
              <div className="col-span-4 font-bold text-slate-950 truncate uppercase tracking-tighter italic">{p.name}</div>
              <div className="col-span-2 text-slate-400 font-black uppercase text-[8px] tracking-widest">{p.manufacturer || "---"}</div>
              <div className="col-span-2 text-right font-black text-slate-950 tabular-nums italic">{priceNetto.toFixed(2)}</div>
              <div className="col-span-2 text-right font-black text-primary bg-primary/5 px-2 py-1 tabular-nums italic">{priceGross.toFixed(2)}</div>
            </div>
          )
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20 no-blur max-w-[1920px] mx-auto print:m-0">
      
      {/* 1. OPERATIONAL PRICING HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-8 border-b-2 border-slate-950 pb-8 print:hidden">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center shadow-xl">
              <Database className="w-7 h-7 text-primary" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">PRICING_MATRIX_ENGINE</span>
                 <div className="w-8 h-[1px] bg-slate-200" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Matrix_v4_Grid</span>
              </div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Generator Cenników</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={handleExportExcel} 
             disabled={exporting}
             className="h-12 px-6 bg-white border border-slate-100 text-slate-400 hover:text-slate-950 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all active-press italic"
           >
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <FileSpreadsheet className="w-4 h-4" />}
              EKSPORT_XLSX
           </button>
           <button 
             onClick={handlePrint} 
             className="h-12 px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-4 active-press transition-all hover:bg-primary shadow-xl shadow-primary/10 italic rounded-none"
           >
              <Printer className="w-4 h-4 text-primary" /> DRUKUJ_BLUEPRINT_PDF
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
         
         {/* 2. COMMAND CONTROL ASIDE (LEFT) */}
         <aside className="xl:col-span-3 space-y-8 print:hidden">
            
            {/* PRICING MATRIX SELECTOR */}
            <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none">
               <div className="p-4 bg-slate-950 flex items-center gap-3 text-white italic">
                  <Percent className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Korekta_Matrycy</span>
               </div>
               
               <div className="p-8 space-y-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Sektor_Klienta (Tier)</label>
                     <div className="grid grid-cols-1 gap-1">
                        {Object.keys(PRICING_MATRIX).map(tier => (
                           <button 
                              key={tier}
                              onClick={() => setSelectedTier(tier)}
                              className={`h-11 px-5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest border transition-all active-press italic ${selectedTier === tier ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-primary'}`}
                           >
                              {tier} {selectedTier === tier && <ShieldCheck className="w-4 h-4" />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Narzut_Własny (%)</label>
                     <div className="relative group">
                        <input 
                           type="number"
                           value={customMarkup}
                           onChange={(e) => setCustomMarkup(Number(e.target.value))}
                           className="w-full h-12 bg-slate-50 border border-slate-100 px-4 text-[13px] font-black text-slate-950 outline-none focus:border-primary focus:bg-white transition-all shadow-sm italic"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 italic">%</div>
                     </div>
                  </div>

                  <button 
                     onClick={() => setIsWhiteLabel(!isWhiteLabel)}
                     className={`w-full h-11 border-2 px-6 flex items-center justify-between transition-all active-press italic ${isWhiteLabel ? 'bg-slate-950 border-slate-950 text-white' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-950'}`}
                   >
                     <div className="flex items-center gap-3">
                        {isWhiteLabel ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">White-Label_Mode</span>
                     </div>
                     <div className={`w-3 h-3 border-2 ${isWhiteLabel ? 'bg-primary border-primary' : 'bg-white border-slate-100'}`} />
                  </button>
               </div>
            </div>

            {/* SECTOR FILTER BOX */}
            <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none">
               <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <LayoutGrid className="w-4 h-4 text-slate-400" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-950 italic">Sektory_Techniczne</span>
                  </div>
                  <button 
                     onClick={() => setSelectedCategoryIds(categories.map(c => c.id))}
                     className="text-[9px] font-black text-primary underline uppercase italic"
                  >
                     RESET
                  </button>
               </div>
               
               <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {categories.map(cat => (
                     <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full h-10 px-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border transition-all active-press mb-1 italic ${selectedCategoryIds.includes(cat.id) ? 'bg-slate-950 border-slate-950 text-white' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-950'}`}
                     >
                        {getIcon(cat.iconName, "w-4 h-4 opacity-40")}
                        <span className="truncate">{cat.name}</span>
                        {selectedCategoryIds.includes(cat.id) && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                     </button>
                  ))}
               </div>

               <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <ArrowDownNarrowWide className={`w-4 h-4 cursor-pointer transition-colors ${sortByManufacturer ? 'text-primary' : 'text-slate-300'}`} onClick={() => setSortByManufacturer(!sortByManufacturer)} />
                     <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-400">Sort_Manufacturer</span>
                  </div>
                  <div 
                    onClick={() => setSortByManufacturer(!sortByManufacturer)}
                    className={`h-5 w-9 p-1 flex items-center cursor-pointer transition-colors ${sortByManufacturer ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <div className={`h-3 w-3 bg-white transition-transform ${sortByManufacturer ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
               </div>
            </div>
         </aside>

         {/* 3. DOCUMENT BLUEPRINT VIEW (RIGHT) */}
         <main className="xl:col-span-9 print:block print:w-full">
            <div className="technical-panel p-0 bg-white shadow-2xl print:border-none print:shadow-none min-h-[1200px] flex flex-col relative overflow-hidden border border-slate-50">
               
               {/* OPERATIONAL WATERMARK */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 pointer-events-none opacity-[0.02]">
                  <span className="text-[120px] font-black text-slate-950 uppercase tracking-[0.2em] whitespace-nowrap italic">PRICING_ENGINE_BLUEPRINT</span>
               </div>

               {/* DOCUMENT_BLUEPRINT_HEADER */}
               <div className="p-12 border-b-[5px] border-slate-950 relative z-10">
                  <div className="flex justify-between items-start">
                     <div className="space-y-6">
                        {!isWhiteLabel && (
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center font-black italic">CT</div>
                              <span className="text-2xl font-black italic tracking-tighter uppercase">CEL-TRONICS</span>
                           </div>
                        )}
                        <div className="space-y-2">
                           <h1 className="text-6xl font-black uppercase tracking-tighter italic leading-none text-slate-950">
                              MATRIX_<span className="text-primary NOT-italic">CENNIK</span>
                           </h1>
                           <div className="flex items-center gap-4 mt-4">
                              <div className="h-[2px] w-12 bg-primary" />
                              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Core_Registry_Matrix_v4.0</span>
                           </div>
                        </div>
                     </div>

                     <div className="text-right flex flex-col items-end">
                        <div className="flex flex-col mb-8">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic mb-1">Generated_On:</span>
                           <span className="text-sm font-black text-slate-950 italic">{new Date().toLocaleDateString('pl-PL')}</span>
                        </div>
                        {!isWhiteLabel ? (
                           <div className="text-[11px] font-black text-slate-950 flex flex-col items-end gap-1 uppercase italic tracking-tighter">
                              <span className="bg-slate-950 text-white px-3 py-1 mb-2">CELTRONICS S.C.</span>
                              <span>NIP: 123-456-78-90</span>
                              <span>BIURO@CELTRONICS.PL</span>
                              <span className="text-primary underline underline-offset-4 decoration-2">WWW.CELTRONICS.PL</span>
                           </div>
                        ) : (
                           <div className="h-28 w-60 border-4 border-dashed border-slate-100 flex items-center justify-center">
                              <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.4em] italic">PARTNER_BRAND_LOGO</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* DOCUMENT_BLUEPRINT_CONTENT */}
               <div className="p-12 flex-1 space-y-16 relative z-10">
                  {categories
                     .filter(cat => selectedCategoryIds.includes(cat.id))
                     .map(cat => {
                        const productsInMainCat = filteredProducts.filter(p => p.categoryId === cat.id);
                        if (productsInMainCat.length === 0) return null;

                        return (
                           <div key={cat.id} className="space-y-8">
                              {/* SECTOR_LEVEL_HEADER */}
                              <div className="flex items-center justify-between border-b-2 border-slate-950 pb-4">
                                 <div className="flex items-center gap-4">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-slate-950">{cat.name}</h2>
                                    <div className="px-3 py-1 bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest">SEC_ID_{cat.id.substring(0,4).toUpperCase()}</div>
                                 </div>
                                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">{productsInMainCat.length} POSITION_LOGS</span>
                              </div>

                              {/* SUBCATS / CLUSTERS */}
                              {(cat.subcategories || []).map((sub: any) => {
                                 const productsInSub = productsInMainCat.filter(p => p.subcategoryId === sub.id);
                                 if (productsInSub.length === 0) return null;

                                 return (
                                    <div key={sub.id} className="space-y-4">
                                       <div className="flex items-center gap-3 text-slate-400">
                                          <div className="w-1.5 h-1.5 bg-primary" />
                                          <span className="text-[12px] font-black uppercase tracking-widest italic leading-none">{sub.name}</span>
                                       </div>
                                       <PricelistTable products={productsInSub} />
                                    </div>
                                 );
                              })}

                              {/* UNCLUSTERED POSITION */}
                              {productsInMainCat.filter(p => !p.subcategoryId).length > 0 && (
                                 <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-slate-300 italic">
                                       <div className="w-1.5 h-1.5 bg-slate-200" />
                                       <span className="text-[12px] font-black uppercase tracking-widest leading-none">Pozostałe pozycje operacyjne</span>
                                    </div>
                                    <PricelistTable products={productsInMainCat.filter(p => !p.subcategoryId)} />
                                 </div>
                              )}
                           </div>
                        )
                     })
                  }
                  {filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 opacity-10">
                       <Box className="w-20 h-20 mb-6" />
                       <span className="text-[16px] font-black uppercase tracking-[0.6em] italic">NO_REGISTRY_RESULTS_FOUND</span>
                    </div>
                  )}
               </div>

               {/* DOCUMENT_EXPORT_FOOTER */}
               <footer className="p-12 bg-slate-50 border-t-2 border-slate-950 relative z-10">
                  <div className="grid grid-cols-2 gap-16">
                     <div className="space-y-4">
                        <span className="text-[10px] font-black uppercase text-slate-950 border-b border-slate-200 pb-2 flex items-center gap-3 italic">
                           <Activity className="w-4 h-4 text-primary" /> NOTY_EKSPLOATACYJNE
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider italic">
                           Dokument wygenerowany w trybie <span className="text-slate-950">MISSION_CONTROL_MATRIX</span>. Ceny przeliczone dla grupy {selectedTier}. Narzut operacyjny: {customMarkup}%. Indeksy zsynchronizowane z bazą PIM. Dokument nie stanowi oferty handlowej.
                        </p>
                     </div>
                     <div className="flex flex-col items-end justify-between">
                        <div className="flex gap-4">
                           <Smartphone className="w-5 h-5 text-slate-200" />
                           <Monitor className="w-5 h-5 text-slate-200" />
                           <HardDrive className="w-5 h-5 text-slate-200" />
                        </div>
                        <div className="text-right">
                           <span className="text-[11px] font-black text-slate-950 italic uppercase tracking-tighter">System_Celtronics_B2B | 2026</span>
                           <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mt-1 italic">Identity_Verified_v9.2</p>
                        </div>
                     </div>
                  </div>
               </footer>

            </div>
         </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
          .mx-auto { margin: 0 !important; max-width: 100% !important; }
          header, nav, aside { display: none !important; }
        }
      `}} />

    </div>
  )
}
