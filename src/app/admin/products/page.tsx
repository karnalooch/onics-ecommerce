"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageSearch, Plus, UploadCloud, Search, Edit2, ShieldAlert, Check, X, AlertTriangle, Trash2, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Staging Area
  const [stagingPayload, setStagingPayload] = useState<any[]>([]);

  // Filtry
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [selectedManufacturer, setSelectedManufacturer] = useState("ALL");

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
    loadData();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (nameL.includes('kamera') || nameL.includes('rejestrator') || nameL.includes('cctv') || nameL.includes('dvr') || nameL.includes('nvr') || nameL.includes('ip')) {
           return categories.find(c => c.name.toLowerCase().includes('monitor'))?.id || categories[0]?.id;
        }
        if (nameL.includes('antena') || nameL.includes('konwerter') || nameL.includes('dekoder') || nameL.includes('sat')) {
           return categories.find(c => c.name.toLowerCase().includes('tv-sat'))?.id || categories[0]?.id;
        }
        if (nameL.includes('router') || nameL.includes('switch') || nameL.includes('punkt') || nameL.includes('ap') || nameL.includes('lan')) {
           return categories.find(c => c.name.toLowerCase().includes('lan'))?.id || categories[0]?.id;
        }
        if (nameL.includes('światłowod') || nameL.includes('patchcord') || nameL.includes('pigtajl')) {
           return categories.find(c => c.name.toLowerCase().includes('światłowod'))?.id || categories[0]?.id;
        }
        if (nameL.includes('alarm') || nameL.includes('czujka') || nameL.includes('syrena') || nameL.includes('satel')) {
           return categories.find(c => c.name.toLowerCase().includes('alarm'))?.id || categories[0]?.id;
        }
        return categories[0]?.id; // Default
      };

      const parsedPayload = json.map((row: any) => {
        const getVal = (keys: string[]) => {
          const foundKey = Object.keys(row).find(k => keys.some(keyMatch => k.toLowerCase().includes(keyMatch)));
          return foundKey ? row[foundKey] : undefined;
        };

        const sku = String(getVal(["sku", "ean", "kod", "indeks"]) || `IMP-${Math.random().toString().slice(2,8)}`);
        const price = Number(getVal(["price", "cena", "netto"]) || 0);
        const name = String(getVal(["name", "nazwa", "produkt"]) || "Nieznany Produkt");
        
        const existingProduct = products.find(p => p.sku === sku);
        let priceDiff = 0;
        let isNew = !existingProduct;
        let categoryId = existingProduct?.categoryId;
        let aiSuggested = false;

        if (existingProduct) {
          priceDiff = price - existingProduct.price;
        } else {
          categoryId = suggestCategory(name);
          aiSuggested = true;
        }

        return {
          sku,
          name,
          price,
          stock: Number(getVal(["stock", "stan", "ilość", "ilosc", "magazyn"]) || 0),
          manufacturer: String(getVal(["manufacturer", "producent", "marka"]) || existingProduct?.manufacturer || "Inny"),
          categoryId,
          seoDescription: existingProduct?.seoDescription || "",
          // Staging flags:
          isNew,
          priceDiff,
          oldPrice: existingProduct?.price,
          aiSuggested
        };
      });

      setStagingPayload(parsedPayload);
    } catch (err) {
      console.error(err);
      alert("Wystąpił błąd podczas analizy pliku Excel. Upewnij się, że struktura jest prawidłowa.");
    } finally {
      setImporting(false);
      if (e.target) e.target.value = ''; 
    }
  };

  // --- STAGING ACTIONS ---
  const handleRemoveFromStaging = (sku: string) => {
    setStagingPayload(prev => prev.filter(item => item.sku !== sku));
  };

  const handleUpdateStagingItem = (sku: string, field: string, value: any) => {
    setStagingPayload(prev => prev.map(item => {
       if (item.sku === sku) {
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
  };

  // ZAPISUJEMY POJEDYNCZY ARTYKUŁ WPROST DO BAZY
  const commitSingleItemToDatabase = async (sku: string) => {
    const itemToCommit = stagingPayload.find(i => i.sku === sku);
    if (!itemToCommit) return;
    
    // Wizualnie symulujemy że "leci do API", na chwilę można wyłączyć z widoku
    handleRemoveFromStaging(sku);
    
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "IMPORT_WFMAG", items: [itemToCommit] }) // wysyłamy jako array jednoelementowy
      });
      if (res.ok) {
        // Natychmiastowe dociągnięcie aktualnej bazy do głównej tabeli tle
        await loadData();
      }
    } catch (e) {
      alert("Wystąpił błąd podczas zapisywania artykułu do bazy. Rekord przywrócono.");
      setStagingPayload(prev => [itemToCommit, ...prev]);
    }
  };

  // ZAPISUJEMY ZBIORCZO POZOSTAŁOŚCI
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
        alert(`✅ Import udany! Zaktualizowano / Dodano ${result.updatedCount + result.addedCount} indeksów.`);
        setStagingPayload([]);
        await loadData();
      }
    } catch (e) {
      alert("Wystąpił błąd podczas masowego zapisu.");
    } finally {
      setImporting(false);
    }
  };

  const cancelStaging = () => {
    setStagingPayload([]);
  };

  // --- FILTROWANIE ---
  const manufacturers = Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean)));
  const filteredProducts = products.filter(p => {
    const matchSearch = String(p.name).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.sku).toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCat === "ALL" || p.categoryId === selectedCat;
    const matchManuf = selectedManufacturer === "ALL" || p.manufacturer === selectedManufacturer;
    return matchSearch && matchCat && matchManuf;
  });
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "Kategoria Usunięta";

  // --- WIDOK POCZEKALNI (STAGING) ---
  if (stagingPayload.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 max-w-[1600px] mx-auto border-[3px] border-orange-400 rounded-3xl p-6 bg-orange-50/30">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-orange-200">
          <div className="flex flex-col gap-2">
             <h2 className="text-3xl font-bold tracking-tight text-orange-600 flex items-center gap-3">
               <AlertTriangle className="w-8 h-8" /> Biurko Klasyfikacyjne WF-Mag
             </h2>
             <p className="text-muted-foreground font-medium">
               Plik odtworzony. Możesz zatwierdzać towary sztuka po sztuce (haczykiem) analizując wyłapane odchylenia marginesowe i uzupełniając nowości, bądź zalać resztę do bazy masowo na koniec.
             </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
             <Button variant="outline" onClick={cancelStaging} className="border-red-200 text-red-600 hover:bg-red-50 h-14 px-6 font-bold rounded-xl">
                <X className="w-5 h-5 mr-2" /> Odrzuć Całą Paczkę
             </Button>
             <Button onClick={commitAllStagingToDatabase} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 font-bold shadow-lg shadow-emerald-600/30 rounded-xl whitespace-nowrap">
                {importing ? "Mielenie bazy..." : <><Check className="w-5 h-5 mr-2" /> Zatwierdź Pozostałe ({stagingPayload.length})</>}
             </Button>
          </div>
        </div>

        <Card className="shadow-sm border-orange-200 bg-white">
          <CardContent className="p-0 overflow-x-auto max-h-[700px] overflow-y-auto">
             <Table>
               <TableHeader className="bg-orange-100/50 sticky top-0 z-20 backdrop-blur-sm border-b">
                 <TableRow>
                   <TableHead className="w-[80px]">SKU</TableHead>
                   <TableHead>Nazwa Urządzenia & Metadane SEO</TableHead>
                   <TableHead className="text-center w-[120px]">Status WF-Mag</TableHead>
                   <TableHead className="text-right w-[160px]">Cena Detal</TableHead>
                   <TableHead className="text-center w-[80px]">Stan</TableHead>
                   <TableHead className="text-right w-[130px]">Magazynek Peryferyjny</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {stagingPayload.map((item) => {
                    let diffBg = "";
                    if (item.priceDiff > 0) diffBg = "bg-green-100/50 border-emerald-300";
                    else if (item.priceDiff < 0) diffBg = "bg-red-100/50 border-red-300";
                    else if (item.isNew) diffBg = "bg-blue-50/50 border-blue-200";

                    return (
                       <TableRow key={item.sku} className={`transition-all ${diffBg ? `border-l-[6px] ${diffBg}` : 'border-l-[6px] border-l-transparent'} ${item.isNew ? 'bg-slate-50/50' : ''}`}>
                          <TableCell className="font-bold font-mono text-xs">{item.sku}</TableCell>
                          
                          <TableCell className="max-w-[400px]">
                            {item.isNew ? (
                              <div className="flex flex-col gap-3 py-2">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tytuł Zwracany w Sklepie B2B</label>
                                <input 
                                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={item.name}
                                  onChange={(e) => handleUpdateStagingItem(item.sku, 'name', e.target.value)}
                                />
                                
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                       Kategoria 
                                       {item.aiSuggested && <span className="ml-2 text-[10px] text-fuchsia-600 bg-fuchsia-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"><Sparkles className="w-3 h-3"/> Sugerowane przez NLP</span>}
                                    </label>
                                    <select 
                                      value={item.categoryId}
                                      onChange={(e) => handleUpdateStagingItem(item.sku, 'categoryId', e.target.value)}
                                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-muted-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Producent</label>
                                    <input 
                                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-muted-foreground focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={item.manufacturer || ''}
                                      onChange={(e) => handleUpdateStagingItem(item.sku, 'manufacturer', e.target.value)}
                                      placeholder="Z WF-Maga..."
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5 mt-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex justify-between">Ochrona SEO <span className="text-[10px] text-orange-500">Pole Opcjonalne</span></label>
                                    <textarea 
                                      className="w-full px-3 py-2 border rounded-lg text-xs bg-orange-50/50 text-orange-900 border-orange-200 focus:ring-2 focus:ring-orange-500 outline-none min-h-[60px]"
                                      value={item.seoDescription || ''}
                                      onChange={(e) => handleUpdateStagingItem(item.sku, 'seoDescription', e.target.value)}
                                      placeholder="<h3>Wpisz tutaj HTML lub czysty tekst pozycjonujący. Nie zostanie nadpisany w przyszłości przez hurtownię.</h3>"
                                    />
                                </div>
                              </div>
                            ) : (
                              <div className="font-semibold text-sm truncate">{item.name}</div>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center align-top pt-6">
                             {item.isNew ? (
                               <Badge className="bg-blue-600 text-xs shadow-sm shadow-blue-600/30">Nowy Indeks</Badge>
                             ) : item.priceDiff !== 0 ? (
                               <div className={`flex flex-col items-center justify-center p-2 rounded-lg border bg-white shadow-sm font-bold text-sm ${item.priceDiff > 0 ? 'text-emerald-700 border-emerald-200' : 'text-red-700 border-red-200'}`}>
                                  <span className="flex items-center gap-1">
                                    {item.priceDiff > 0 ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4" />} 
                                    {Math.abs(item.priceDiff).toFixed(2)} PLN
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 text-center">Różnica Cennika</span>
                               </div>
                             ) : (
                               <Badge variant="outline" className="text-muted-foreground bg-white">Odświeżono</Badge>
                             )}
                          </TableCell>

                          <TableCell className="text-right align-top pt-6">
                             <div className="flex flex-col items-end gap-1 relative group">
                               <div className="flex items-center">
                                  <input 
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => handleUpdateStagingItem(item.sku, 'price', e.target.value)}
                                    className="w-24 px-2 py-1.5 border rounded-lg bg-white text-right font-bold text-base focus:ring-2 focus:ring-orange-400 outline-none border-gray-300"
                                  />
                                  <span className="text-xs text-muted-foreground font-bold ml-1.5 pt-1">PLN</span>
                               </div>
                               {!item.isNew && item.oldPrice && (
                                  <div className="text-[10px] text-muted-foreground pr-8">Wcześniej: <span className="line-through">{item.oldPrice.toFixed(2)} PLN</span></div>
                               )}
                             </div>
                          </TableCell>
                          
                          <TableCell className="text-center font-mono font-bold text-base align-top pt-7">
                             {item.stock} <span className="text-xs text-muted-foreground font-sans">szt</span>
                          </TableCell>
                          
                          <TableCell className="text-right align-top pt-6">
                             <div className="flex items-center justify-end gap-1.5">
                               <Button variant="ghost" size="icon" onClick={() => handleRemoveFromStaging(item.sku)} className="w-10 h-10 border border-gray-200 bg-white text-gray-500 hover:text-red-700 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all rounded-xl" title="Upuść ten rekord do kosza">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                               
                               <Button size="icon" onClick={() => commitSingleItemToDatabase(item.sku)} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition-all rounded-xl" title="Gotowe! Publikuj w Bazie Sklepu od zaraz.">
                                 <Check className="w-5 h-5" />
                               </Button>
                             </div>
                          </TableCell>
                       </TableRow>
                    );
                 })}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- NORMALNY WIDOK BAZY PRODUKTÓW ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PackageSearch className="h-8 w-8 text-primary" /> Baza Produktów (CMS)
          </h2>
          <p className="text-muted-foreground">
            Zarządzaj katalogiem. Edytuj opisy techniczne z gwarancją zabezpieczenia przed narzutem synchronizacji z WF-Maga.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xls,.xlsx,.csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button 
            variant="secondary" 
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md"
            onClick={handleWfMagImportClick}
            disabled={importing}
          >
            <UploadCloud className="h-4 w-4" /> 
            {importing ? "Analiza..." : "Importuj Plik .XLS (WF-Mag)"}
          </Button>
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Nowy Ręczny Produkt
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-blue-100/50">
        <CardHeader className="bg-muted/10 border-b pb-4">
           {/* Moduł Opcji / Filtrowania SPA */}
           <div className="flex flex-col md:flex-row gap-4 items-center w-full">
             
             <div className="flex bg-white dark:bg-gray-900 border rounded-xl overflow-hidden shadow-sm flex-1 items-center pl-3 w-full">
               <Search className="w-5 h-5 text-muted-foreground shrink-0" />
               <input 
                 type="text" 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 placeholder="Wyszukaj po Nazwie Urządzenia lub SKU..."
                 className="flex-1 bg-transparent border-none py-2.5 px-3 outline-none text-sm focus:ring-0"
               />
             </div>

             <div className="flex items-center gap-4 w-full md:w-auto">
               <select 
                 value={selectedCat} 
                 onChange={e => setSelectedCat(e.target.value)}
                 className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary w-full md:w-48"
               >
                 <option value="ALL">Wszystkie Kategorie</option>
                 {categories.map(c => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>

               <select 
                 value={selectedManufacturer} 
                 onChange={e => setSelectedManufacturer(e.target.value)}
                 className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary w-full md:w-48"
               >
                 <option value="ALL">Każdy Producent</option>
                 {manufacturers.map(m => (
                   <option key={m as string} value={m as string}>{m as string}</option>
                 ))}
               </select>
             </div>

           </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
             <div className="py-24 text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                Ładowanie struktury centrum produktowego...
             </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-base text-muted-foreground text-center py-24 flex flex-col items-center">
              <PackageSearch className="w-16 h-16 opacity-20 mb-4" />
              Baza zadanego asortymentu jest pusta. Zaimportuj stany z magazynu WF-Mag lub zmień filtry!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead className="w-[100px] py-4">Status / SKU</TableHead>
                    <TableHead>Nazwa Urządzenia</TableHead>
                    <TableHead>Kategoria / Producent</TableHead>
                    <TableHead className="text-right">Baza</TableHead>
                    <TableHead className="text-center">Stan Mag.</TableHead>
                    <TableHead className="text-center">Blokada Opisu SEO</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(p => (
                    <TableRow key={p.id} className="hover:bg-muted/20 hover:shadow-sm transition-all group">
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col gap-1">
                           <span className="font-bold text-gray-800 dark:text-gray-200">{p.sku}</span>
                           {p.stock > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Dostępny</Badge>
                           ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Brak. Mag.</Badge>
                           )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-[15px]">{p.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{getCategoryName(p.categoryId)}</span>
                          <span className="text-xs text-muted-foreground">{p.manufacturer || "Brak Danych"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <span className="font-bold text-lg text-primary">{Number(p.price).toFixed(2)}</span>
                         <span className="text-xs text-muted-foreground ml-1">PLN</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono font-medium ${p.stock > 10 ? 'text-emerald-600' : 'text-orange-600'}`}>
                          {p.stock} szt.
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                         {p.seoDescription ? (
                           <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                             <ShieldAlert className="w-3.5 h-3.5" /> Chroniony (Custom)
                           </div>
                         ) : (
                           <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border px-2.5 py-1 rounded-full">
                             Synchronizowany automatycznie
                           </div>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-8 gap-2 bg-slate-50 hover:bg-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-3.5 h-3.5" /> Edytuj Akt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
