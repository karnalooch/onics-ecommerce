"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Printer, Filter, Tag, Search, 
  CheckCircle2, FileSpreadsheet, Download, RefreshCw,
  ChevronRight, Info
} from "lucide-react"
import * as Icons from "lucide-react"
import * as XLSX from "xlsx"

const VAT_RATE = 0.23;

export default function PricelistGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sortByManufacturer, setSortByManufacturer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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

  // Logic to toggle categories
  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(c => c !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  }

  // Filter and Sort Logic
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
      const getCatName = (id: string) => categories.find(c => c.id === id)?.name || "—";
      const getSubName = (catId: string, subId?: string) => {
        if (!subId) return "—";
        return categories.find(c => c.id === catId)?.subcategories?.find((s: any) => s.id === subId)?.name || "—";
      };

      const exportData = filteredProducts.map(p => ({
        "Kod Produktu / SKU": p.sku,
        "Producent": p.manufacturer || "Inny",
        "Nazwa": p.name,
        "Kategoria": getCatName(p.categoryId),
        "Podkategoria": getSubName(p.categoryId, p.subcategoryId),
        "Cena Netto": p.price,
        "Cena Brutto (23%)": parseFloat((p.price * 1.23).toFixed(2))
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cennik");
      XLSX.writeFile(wb, `Cennik_Celtronics_${new Date().toLocaleDateString()}.xlsx`);
      
      setExporting(false);
    }, 800);
  }

  // Helper component for tables
  const PricelistTable = ({ products }: { products: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow className="border-b-2 border-primary/20 hover:bg-transparent">
          <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-tighter">Symbol / SKU</TableHead>
          <TableHead className="text-[10px] font-black uppercase tracking-tighter">Nazwa Urządzenia</TableHead>
          <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-tighter">Producent</TableHead>
          <TableHead className="w-[100px] text-right text-[10px] font-black uppercase tracking-tighter">Cena Netto</TableHead>
          <TableHead className="w-[110px] text-right text-[10px] font-black uppercase tracking-tighter bg-primary/5">Cena Brutto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => {
          const priceGross = p.price * (1 + VAT_RATE);
          return (
            <TableRow key={p.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
              <TableCell className="font-mono text-[11px] font-bold tracking-tighter">{p.sku}</TableCell>
              <TableCell>
                <p className="font-bold text-xs leading-none">{p.name}</p>
              </TableCell>
              <TableCell className="text-[10px] font-medium text-muted-foreground">{p.manufacturer || "..."}</TableCell>
              <TableCell className="text-right text-xs font-medium">{p.price.toFixed(2)} zł</TableCell>
              <TableCell className="text-right text-xs font-black bg-primary/5">{priceGross.toFixed(2)} zł</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:p-0">
      
      {/* Header (Hidden on print) */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            Generator Cenników
          </h2>
          <p className="text-muted-foreground ml-10">
            Twórz profesjonalne zestawienia produktów i eksportuj do PDF/XLSX.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleExportExcel} disabled={loading} className="gap-2">
             {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
             Eksportuj Excel
           </Button>
           <Button onClick={handlePrint} className="gap-2 shadow-lg shadow-primary/20">
            <Printer className="h-4 w-4" /> Drukuj / Zapisz PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:block print:w-full">
        
        {/* Sidebar: Filters (Hidden on print) */}
        <div className="md:col-span-3 space-y-4 print:hidden">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtry i Widok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Szukaj</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Wpisz nazwę lub SKU..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Kategorie</label>
                <div className="grid grid-cols-1 gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                        selectedCategoryIds.includes(cat.id) 
                        ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                        : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {getIcon(cat.iconName, "h-3.5 w-3.5")}
                      <span className="flex-1 text-left">{cat.name}</span>
                      {selectedCategoryIds.includes(cat.id) && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-all">
                  <span className="text-xs font-medium">Sortuj wg producenta</span>
                  <input 
                    type="checkbox" 
                    checked={sortByManufacturer}
                    onChange={() => setSortByManufacturer(!sortByManufacturer)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Main: Price List Preview (col-span-9) */}
        <div className="md:col-span-9 print:block print:w-full">
          <Card className="min-h-[1000px] print:border-none print:shadow-none shadow-xl border-primary/10 transition-all duration-300">
            <CardHeader className="border-b border-dashed pb-8">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="h-10 w-10 bg-primary flex items-center justify-center rounded-none font-bold text-white text-xl">C</div>
                     <span className="text-xl font-bold tracking-tighter brightness-0">CELTRONICS</span>
                   </div>
                  <h1 className="text-4xl font-black uppercase text-primary tracking-tighter leading-none">Cennik Produktowy</h1>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Aktualizacja na dzień: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-right text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-bold text-foreground text-sm">Celtronics S.C.</p>
                  <p>NIP: 123-456-78-90</p>
                  <p>ul. Niklowa 22, 08-110 Siedlce</p>
                  <p>e-mail: biuro@celtronics.pl</p>
                  <p className="mt-4 text-primary font-black uppercase tracking-widest text-[8px]">Dokument PDF</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-6 px-0 md:px-6">
              
              {/* Table Grouped by Category if multiple selected, else just simple list              {/* Table Grouped by Category/Subcategory */}
              <div className="space-y-12">
                {categories
                  .filter(cat => selectedCategoryIds.includes(cat.id))
                  .map(cat => {
                    const productsInMainCat = filteredProducts.filter(p => p.categoryId === cat.id);
                    if (productsInMainCat.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-8">
                        {/* Główny Nagłówek Kategorii */}
                        <div className="flex items-center gap-4 px-5 py-3 bg-slate-900 text-white rounded-none border-l-[10px] border-primary">
                           <div className="p-2 bg-white/10 rounded-lg">
                             {getIcon(cat.iconName, "h-6 w-6")}
                           </div>
                           <h3 className="text-xl font-black uppercase tracking-tighter">{cat.name}</h3>
                           <div className="h-[1px] flex-1 bg-white/20"></div>
                           <span className="text-xs font-bold opacity-60 italic text-white uppercase">{productsInMainCat.length} produktów</span>
                        </div>

                        {/* Grupowanie po Podkategoriach */}
                        {(cat.subcategories || []).map((sub: any) => {
                          const productsInSub = productsInMainCat.filter(p => p.subcategoryId === sub.id);
                          if (productsInSub.length === 0) return null;

                          return (
                            <div key={sub.id} className="space-y-4 pl-0 md:pl-4">
                              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b-2 border-slate-100 pb-2">
                                <ChevronRight className="w-4 h-4 text-primary" /> {sub.name}
                              </h4>
                              <PricelistTable products={productsInSub} />
                            </div>
                          );
                        })}

                        {/* Produkty bez podkategorii */}
                        {productsInMainCat.filter(p => !p.subcategoryId).length > 0 && (
                          <div className="space-y-4 pl-0 md:pl-4">
                            <h4 className="text-sm font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-2 italic">
                              Pozostałe akcesoria
                            </h4>
                            <PricelistTable products={productsInMainCat.filter(p => !p.subcategoryId)} />
                          </div>
                        )}
                      </div>
                    )
                  })
                }

                {filteredProducts.length === 0 && (
                  <div className="py-20 text-center space-y-4">
                     <div className="inline-flex p-4 bg-muted rounded-full">
                        <Search className="h-8 w-8 text-muted-foreground" />
                     </div>
                     <p className="text-sm text-muted-foreground font-medium italic">Nie znaleziono produktów spełniających kryteria.</p>
                  </div>
                )}
              </div>

              {/* PDF Footer Information */}
              <div className="mt-16 pt-8 border-t border-dashed space-y-6">
                <div className="grid grid-cols-2 gap-10">
                  <div className="text-[10px] text-muted-foreground leading-relaxed">
                    <p className="font-bold text-foreground border-b mb-2 pb-1 uppercase tracking-widest text-[9px]">Warunki Handlowe</p>
                    <p>Wszystkie podane ceny są cenami orientacyjnymi. Niniejszy cennik nie stanowi oferty handlowej w rozumieniu Art. 66 par. 1 Kodeksu Cywilnego. Zastrzegamy sobie prawo do zmian parametrów technicznych oraz cen produktów bez uprzedniego powiadomienia.</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-relaxed">
                    <p className="font-bold text-foreground border-b mb-2 pb-1 uppercase tracking-widest text-[9px]">Współpraca B2B</p>
                    <p>Dla stałych partnerów i firm instalatorskich przewidzieliśmy indywidualny system rabatowy. Zaloguj się do panelu B2B, aby zobaczyć ceny po uwzględnieniu Twoich zniżek.</p>
                  </div>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-lg flex justify-between items-center border border-primary/10">
                   <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Celtronics - Twoje Bezpieczeństwo, Nasza Pasja</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Odwiedź nas na: <span className="text-foreground">www.celtronics.pl</span></p>
                   </div>
                   <div className="h-8 w-[1px] bg-primary/20 mx-4"></div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-muted-foreground">Strona 1 / 1</p>
                   </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global CSS for Print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .animate-in {
            animation: none !important;
          }
        }
      `}} />
    </div>
  )
}
