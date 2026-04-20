"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Printer, Filter, Tag, Search, 
  CheckCircle2, FileSpreadsheet, Download, RefreshCw,
  ChevronRight, Info, Database, Eye, EyeOff, LayoutDashboard,
  Percent, ArrowDownNarrowWide, Smartphone, Monitor, HardDrive, Bell
} from "lucide-react"
import * as Icons from "lucide-react"
import * as XLSX from "xlsx"
import { calculateB2BPrice, PRICING_MATRIX } from "./_lib/priceLogic"

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

  useEffect(() => {
    const load = async () => {
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
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      setExporting(false);
    }, 800);
  }

  const PricelistTable = ({ products }: { products: any[] }) => (
    <div className="flex flex-col border border-slate-200 mt-2 bg-white">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 tabular-nums">
        <div className="col-span-2">Symbol / SKU</div>
        <div className="col-span-4">Nazwa Urządzenia</div>
        <div className="col-span-2">Producent</div>
        <div className="col-span-2 text-right">Cena Netto</div>
        <div className="col-span-2 text-right">Brutto (23%)</div>
      </div>
      <div className="divide-y divide-slate-100">
        {products.map((p) => {
          const b2b = calculateB2BPrice(p, selectedTier);
          const priceNetto = b2b.price * (1 + customMarkup / 100);
          const priceGross = priceNetto * (1 + VAT_RATE);
          return (
            <div key={p.id} className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] items-center hover:bg-slate-50 transition-colors font-mono">
              <div className="col-span-2 font-black text-primary truncate tracking-tighter">{p.sku}</div>
              <div className="col-span-4 font-bold text-slate-900 truncate uppercase">{p.name}</div>
              <div className="col-span-2 text-slate-400 font-black italic">{p.manufacturer || "---"}</div>
              <div className="col-span-2 text-right font-black text-slate-900">{priceNetto.toFixed(2)} <span className="opacity-30 text-[8px]">PLN</span></div>
              <div className="col-span-2 text-right font-black text-primary bg-primary/5 px-2 py-0.5">{priceGross.toFixed(2)} <span className="opacity-30 text-[8px]">PLN</span></div>
            </div>
          )
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20 font-mono print:p-0">
      
      {/* 1. MISSION CONTROL HEADER (V4) */}
      <header className="flat-panel p-6 bg-slate-950 text-white flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
         <div className="space-y-1">
            <div className="flex items-center gap-3">
               <Database className="w-5 h-5 text-primary" />
               <h2 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
                  Advanced <span className="text-primary NOT-italic">Pricing Engine</span>
               </h2>
               <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-xs">
                  <span className="text-[8px] font-black uppercase text-primary tracking-widest italic tracking-tighter">Matrix v4.0</span>
               </div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Generowanie cenników B2B z uwzględnieniem matrycy rabatowej i narzutów</p>
         </div>

         <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportExcel} className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/10 px-6 text-[10px] font-black uppercase tracking-widest gap-2">
               {exporting ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : <FileSpreadsheet className="w-4 h-4 text-primary" />}
               Eksport XLSX
            </Button>
            <Button onClick={handlePrint} className="h-10 bg-primary text-slate-950 hover:brightness-110 px-8 text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
               <Printer className="w-4 h-4" /> Drukuj PDF
            </Button>
         </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
         
         {/* 2. COMMAND CENTER (LEFT) */}
         <aside className="xl:col-span-3 space-y-6 print:hidden">
            
            {/* PRICING MATRIX BOX */}
            <div className="flat-panel p-5 bg-slate-50 border-slate-200 space-y-6">
               <div className="flex items-center gap-2 border-l-4 border-primary pl-4">
                  <Percent className="w-4 h-4 text-primary" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Matryca Handlowa</h3>
               </div>

               <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sektor Rabatowania (Tier)</label>
                     <div className="grid grid-cols-1 gap-1">
                        {Object.keys(PRICING_MATRIX).map(tier => (
                           <button 
                              key={tier}
                              onClick={() => setSelectedTier(tier)}
                              className={`h-9 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTier === tier ? 'bg-primary border-primary text-slate-950 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-primary'}`}
                           >
                              {tier} {selectedTier === tier && <ChevronRight className="w-3.5 h-3.5" />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex flex-col gap-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Narzut Operacyjny (%)</label>
                     <input 
                        type="number"
                        value={customMarkup}
                        onChange={(e) => setCustomMarkup(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 h-10 px-4 text-base font-black text-slate-900 focus:border-primary outline-none transition-all"
                     />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-sm">
                     <div className="flex items-center gap-2">
                        {isWhiteLabel ? <EyeOff className="w-3.5 h-3.5 text-primary" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-[9px] font-black uppercase tracking-widest">White-Label Mode</span>
                     </div>
                     <input 
                        type="checkbox" 
                        checked={isWhiteLabel}
                        onChange={() => setIsWhiteLabel(!isWhiteLabel)}
                        className="w-4 h-4 accent-primary"
                     />
                  </div>
               </div>
            </div>

            {/* SECTOR FILTER BOX */}
            <div className="flat-panel p-5 bg-white border-slate-200 space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Sektory Techniczne</h3>
                  <button 
                     onClick={() => setSelectedCategoryIds(categories.map(c => c.id))}
                     className="text-[8px] font-black text-primary underline uppercase"
                  >
                     Reset
                  </button>
               </div>
               
               <div className="space-y-1">
                  {categories.map(cat => (
                     <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full h-8 px-3 flex items-center gap-3 text-[9px] font-black uppercase tracking-widest border transition-all ${selectedCategoryIds.includes(cat.id) ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-900'}`}
                     >
                        {getIcon(cat.iconName, "w-3.5 h-3.5 opacity-40")}
                        <span>{cat.name}</span>
                        {selectedCategoryIds.includes(cat.id) && <CheckCircle2 className="w-3 h-3 text-primary ml-auto" />}
                     </button>
                  ))}
               </div>

               <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-400">
                     <ArrowDownNarrowWide className="w-4 h-4 cursor-pointer" onClick={() => setSortByManufacturer(!sortByManufacturer)} />
                     <span className="text-[9px] font-black uppercase tracking-widest leading-none">Sortuj wg Producenta</span>
                  </div>
                  <input type="checkbox" checked={sortByManufacturer} onChange={() => setSortByManufacturer(!sortByManufacturer)} className="ml-auto accent-slate-900 h-4 w-4" />
               </div>
            </div>
         </aside>

         {/* 3. DOCUMENT PREVIEW (RIGHT) */}
         <main className="xl:col-span-9 print:block print:w-full">
            <div className="technical-panel p-0 bg-white shadow-3xl print:border-none print:shadow-none min-h-[1200px] flex flex-col relative overflow-hidden">
               
               {/* Aesthetic Background Detail */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

               {/* DOCUMENT HEADER */}
               <div className="p-10 border-b-2 border-slate-950 space-y-10">
                  <div className="flex justify-between items-start">
                     <div className="space-y-4">
                        {!isWhiteLabel && (
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center font-black rounded-none">C</div>
                              <span className="text-xl font-black italic tracking-tighter">CELTRONICS</span>
                           </div>
                        )}
                        <div className="space-y-1">
                           <h1 className="text-5xl font-black uppercase tracking-[unset] italic leading-none text-slate-900">Cennik <br/><span className="text-primary NOT-italic">Operacyjny</span></h1>
                           <div className="flex items-center gap-3 pt-2">
                              <div className="h-[2px] w-8 bg-primary" />
                              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Registry Matrix {selectedTier}</span>
                           </div>
                        </div>
                     </div>

                     <div className="text-right space-y-1">
                        <div className="flex flex-col mb-4">
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Data Generacji</span>
                           <span className="text-xs font-black text-slate-950">{new Date().toLocaleDateString('pl-PL')}</span>
                        </div>
                        {!isWhiteLabel ? (
                           <div className="text-[10px] font-bold text-slate-500 flex flex-col uppercase tabular-nums">
                              <span className="text-slate-900 font-black">Celtronics S.C. Siedlce</span>
                              <span>NIP: 123-456-78-90</span>
                              <span>biuro@celtronics.pl</span>
                              <span>www.celtronics.pl</span>
                           </div>
                        ) : (
                           <div className="h-20 w-48 border-2 border-dashed border-slate-200 flex items-center justify-center">
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Twoje Logo Tutaj</span>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* DOCUMENT CONTENT */}
               <div className="p-10 flex-1 space-y-12">
                  {categories
                     .filter(cat => selectedCategoryIds.includes(cat.id))
                     .map(cat => {
                        const productsInMainCat = filteredProducts.filter(p => p.categoryId === cat.id);
                        if (productsInMainCat.length === 0) return null;

                        return (
                           <div key={cat.id} className="space-y-6">
                              {/* SECTOR HEADER */}
                              <div className="flex items-center justify-between border-b-4 border-slate-900 pb-2">
                                 <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 transition-all">{cat.name}</h2>
                                    <div className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase">SEC_{cat.id.substring(0,3).toUpperCase()}</div>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {productsInMainCat.length} POS</span>
                              </div>

                              {/* TIER ROWS / SUBCATS */}
                              {(cat.subcategories || []).map((sub: any) => {
                                 const productsInSub = productsInMainCat.filter(p => p.subcategoryId === sub.id);
                                 if (productsInSub.length === 0) return null;

                                 return (
                                    <div key={sub.id} className="space-y-2">
                                       <div className="flex items-center gap-2 text-slate-400">
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                          <span className="text-[10px] font-black uppercase tracking-widest italic">{sub.name}</span>
                                       </div>
                                       <PricelistTable products={productsInSub} />
                                    </div>
                                 );
                              })}

                              {/* ORPHAN PRODUCTS */}
                              {productsInMainCat.filter(p => !p.subcategoryId).length > 0 && (
                                 <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 italic">
                                       <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Pozostałe pozycje techniczne</span>
                                    </div>
                                    <PricelistTable products={productsInMainCat.filter(p => !p.subcategoryId)} />
                                 </div>
                              )}
                           </div>
                        )
                     })
                  }
               </div>

               {/* DOCUMENT FOOTER */}
               <footer className="p-10 bg-slate-50 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-10">
                     <div className="text-[9px] text-slate-400 space-y-2 uppercase leading-relaxed font-bold">
                        <p className="text-slate-950 font-black border-b border-slate-200 pb-1">Nota Prawna</p>
                        <p>Niniejszy dokument został wygenerowany automatycznie przez system Mission Control V4. Ceny netto przeliczone na podstawie matrycy {selectedTier}. Narzut operacyjny: {customMarkup}%. Dokument nie stanowi oferty w rozumieniu KC.</p>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                           <Smartphone className="w-4 h-4 text-slate-300" />
                           <Monitor className="w-4 h-4 text-slate-300" />
                           <HardDrive className="w-4 h-4 text-slate-300" />
                        </div>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Ewidencja Celtronics.pl | 2026</span>
                     </div>
                  </div>
               </footer>

            </div>
         </main>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          .animate-in { animation: none !important; }
          @page { margin: 0; }
        }
      `}} />

    </div>
  )
}
