"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, Printer, Plus, Trash2, Search, 
  Tv, Smartphone, Video, Network, Activity, Home, Shield,
  ChevronRight, Info, AlertTriangle, Check, X
} from "lucide-react"
import * as Icons from "lucide-react";

export default function QuotesGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<{productId: string, qty: number, discount: number}[]>([]);
  const [clientInfo, setClientInfo] = useState({ name: "Firma Instalatorska XYZ", nip: "1234567890" });
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientDataCollapsed, setIsClientDataCollapsed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, pRes, uRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
          fetch("/api/users")
        ]);
        const [cats, prods, users] = await Promise.all([cRes.json(), pRes.json(), uRes.json()]);
        setCategories(cats);
        setProducts(prods);
        setClients(users.filter((u: any) => u.roleType === "BIZ"));
        if (cats.length > 0) setSelectedCategoryId(cats[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleClientNameChange = (name: string) => {
    setClientInfo(prev => ({ ...prev, name }));
    const client = clients.find((u: any) => u.companyName === name);
    if (client) {
      setClientInfo(prev => ({ ...prev, nip: client.nip || "" }));
    }
  }

  const addLineItem = (productId: string) => {
    setItems([...items, { productId, qty: 1, discount: 0 }]);
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }

  const updateItem = (index: number, field: string, val: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  }

  const getProduct = (id: string) => products.find(p => p.id === id) || products[0] || { name: "...", price: 0, sku: "" };

  const getIcon = (name: string) => {
    const IconComp = (Icons as any)[name] || Info;
    return <IconComp className="h-5 w-5" />;
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const p = getProduct(item.productId);
      const rowTotal = (p.price * (1 - item.discount / 100)) * item.qty;
      return sum + rowTotal;
    }, 0);
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:p-0">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Generator Ofert B2B
          </h2>
          <p className="text-muted-foreground ml-10">
            Szyba konfiguracja ofert dla partnerów biznesowych.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => setItems([])} className="gap-2">
             Wyczyść
           </Button>
           <Button onClick={handlePrint} className="gap-2 shadow-lg shadow-primary/20">
            <Printer className="h-4 w-4" /> Wygeneruj PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:block print:w-full">
        
        {/* SECTION 1: EDITOR & BASKET (Left) - col-span-3 */}
        <div className="md:col-span-3 space-y-4 print:hidden">
          <Card className="border-none shadow-sm bg-muted/20">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" /> Dane Klienta
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsClientDataCollapsed(!isClientDataCollapsed)} 
                className="h-6 w-6 p-0"
              >
                {isClientDataCollapsed ? <Plus className="h-4 w-4" /> : <Trash2 className="h-4 w-4 opacity-0 group-hover:opacity-100" />}
                <ChevronRight className={`h-4 w-4 transition-transform ${isClientDataCollapsed ? "" : "rotate-90"}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {isClientDataCollapsed ? (
                <div onClick={() => setIsClientDataCollapsed(false)} className="cursor-pointer group">
                   <p className="text-[13px] font-bold text-foreground leading-tight">{clientInfo.name || "—"}</p>
                   <p className="text-[10px] text-muted-foreground uppercase font-semibold">NIP: {clientInfo.nip || "—"}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Nazwa Firmy</label>
                    <input 
                      type="text" 
                      list="clients-list"
                      value={clientInfo.name}
                      onChange={(e) => handleClientNameChange(e.target.value)}
                      placeholder="Wyszukaj lub wpisz..."
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-primary transition-all"
                    />
                    <datalist id="clients-list">
                      {clients.map((c: any) => (
                        <option key={c.id} value={c.companyName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">NIP</label>
                    <input 
                      type="text" 
                      value={clientInfo.nip}
                      onChange={(e) => setClientInfo({...clientInfo, nip: e.target.value})}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <Button 
                    className="w-full text-xs h-8 mt-2 variant-outline" 
                    onClick={() => setIsClientDataCollapsed(true)}
                  >
                    Zatwierdź dane
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col border-none shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pozycje w ofercie ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
              <div className="divide-y">
                {items.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground italic text-sm">
                    Brak pozycji. Wybierz produkty z listy po prawej.
                  </div>
                )}
                {items.map((item, idx) => {
                  const p = getProduct(item.productId);
                  return (
                    <div key={idx} className="p-3 hover:bg-muted/50 transition-colors group relative">
                       <button 
                        onClick={() => removeLineItem(idx)} 
                        className="absolute right-2 top-2 p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="pr-6">
                        <p className="text-xs font-bold leading-tight line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground mb-2">{p.sku}</p>
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <label className="text-[9px] uppercase font-semibold text-muted-foreground block">Ilość</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={item.qty} 
                              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))} 
                              className="w-full text-xs font-bold border-b border-transparent hover:border-input focus:border-primary bg-transparent py-0.5" 
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] uppercase font-semibold text-muted-foreground block">Rabat %</label>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={item.discount} 
                              onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))} 
                              className="w-full text-xs font-bold text-destructive border-b border-transparent hover:border-input focus:border-primary bg-transparent py-0.5" 
                            />
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold">{(p.price * (1 - item.discount / 100) * item.qty).toFixed(2)} zł</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/10 mt-auto">
               <div className="flex justify-between items-baseline mb-2">
                 <span className="text-xs text-muted-foreground">Suma netto:</span>
                 <span className="text-lg font-black text-primary">{calculateTotal().toFixed(2)} zł</span>
               </div>
            </div>
          </Card>
        </div>

        {/* SECTION 2: LIVE PREVIEW (Middle) - col-span-6 */}
        <div className="md:col-span-6 print:block print:w-full">
          <Card className="min-h-[842px] print:border-none print:shadow-none shadow-xl border-primary/10">
            <CardHeader className="print:pb-8 border-b border-dashed">
              <div className="flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-2 mb-4">
                     <div className="h-10 w-10 bg-primary flex items-center justify-center rounded-none font-bold text-white text-xl">C</div>
                     <span className="text-xl font-bold tracking-tighter brightness-0">CELTRONICS</span>
                   </div>
                  <h1 className="text-3xl font-black uppercase text-primary tracking-tighter">Oferta Handlowa</h1>
                  <p className="text-xs font-medium text-muted-foreground mt-1">Nr ref: OFF/{new Date().getFullYear()}/{Math.floor(Math.random()*9000)+1000}</p>
                </div>
                <div className="text-right text-[10px] text-muted-foreground">
                  <p className="font-bold text-foreground text-sm">Celtronics S.C.</p>
                  <p>NIP: 123-456-78-90</p>
                  <p>ul. Niklowa 22, 08-110 Siedlce</p>
                  <p>e-mail: biuro@celtronics.pl</p>
                  <p className="mt-2 font-medium">Data: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-[10px] text-primary uppercase tracking-widest mb-2 border-b">Przygotowano dla:</h3>
                  <p className="font-black text-lg text-foreground">{clientInfo.name || "—"}</p>
                  <p className="text-sm font-medium">NIP: {clientInfo.nip || "—"}</p>
                </div>
                <div className="bg-muted/5 p-4 border rounded-sm">
                   <p className="text-[10px] italic text-muted-foreground">Niniejsza oferta została wygenerowana automatycznie w systemie B2B Celtronics.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-8">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-primary hover:bg-transparent">
                    <TableHead className="w-10 text-[10px] font-black uppercase">Lp.</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Urządzenie</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Ilość</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Cena Kat.</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Rabat</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase">Wartość</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Wybierz produkty aby zobaczyć wycenę...
                      </TableCell>
                    </TableRow>
                  )}
                  {(() => {
                    let globalLp = 0;
                    return categories.map(cat => {
                      const itemsInCat = items.map(item => ({ ...item, product: getProduct(item.productId) }))
                                             .filter(i => i.product.categoryId === cat.id);
                      if (itemsInCat.length === 0) return null;

                      return (
                        <React.Fragment key={cat.id}>
                          <TableRow className="bg-primary/5 hover:bg-primary/5 print:bg-primary/5 border-t-2 border-primary">
                             <TableCell colSpan={6} className="py-2 px-4">
                               <div className="flex items-center gap-2">
                                  {getIcon(cat.iconName)}
                                  <span className="font-black uppercase tracking-widest text-xs text-primary">{cat.name}</span>
                               </div>
                             </TableCell>
                          </TableRow>
                          
                          {(cat.subcategories || []).map((sub: any) => {
                             const itemsInSub = itemsInCat.filter(i => i.product.subcategoryId === sub.id);
                             if (itemsInSub.length === 0) return null;
                             return (
                               <React.Fragment key={sub.id}>
                                 <TableRow className="bg-muted/10 hover:bg-muted/10 border-b">
                                    <TableCell colSpan={6} className="py-1 px-4">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3" /> {sub.name}
                                      </span>
                                    </TableCell>
                                 </TableRow>
                                 {itemsInSub.map((item, idx) => {
                                   globalLp++;
                                   const p = item.product;
                                   const priceAfterDiscount = p.price * (1 - item.discount / 100);
                                   const lineTotal = priceAfterDiscount * item.qty;
                                   return (
                                     <TableRow key={item.productId + idx} className="border-b last:border-b-0 hover:bg-transparent">
                                       <TableCell className="font-medium text-[10px]">{globalLp}</TableCell>
                                       <TableCell>
                                         <p className="font-bold text-xs">{p.name}</p>
                                         <p className="text-[9px] text-muted-foreground tracking-tight">{p.sku}</p>
                                       </TableCell>
                                       <TableCell className="text-right text-xs font-medium">{item.qty}</TableCell>
                                       <TableCell className="text-right text-xs">{Number(p.price).toFixed(2)} zł</TableCell>
                                       <TableCell className="text-right text-xs text-destructive font-bold">{item.discount > 0 ? `-${item.discount}%` : '0%'}</TableCell>
                                       <TableCell className="text-right text-xs font-black">{lineTotal.toFixed(2)} zł</TableCell>
                                     </TableRow>
                                   )
                                 })}
                               </React.Fragment>
                             )
                          })}

                          {/* Items in Main Cat WITHOUT subcat */}
                          {itemsInCat.filter(i => !i.product.subcategoryId).length > 0 && (
                             <>
                               <TableRow className="bg-muted/5 hover:bg-muted/5 border-b italic">
                                  <TableCell colSpan={6} className="py-1 px-4">
                                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tighter">Inne / Akcesoria</span>
                                  </TableCell>
                               </TableRow>
                               {itemsInCat.filter(i => !i.product.subcategoryId).map((item, idx) => {
                                 globalLp++;
                                 const p = item.product;
                                 const priceAfterDiscount = p.price * (1 - item.discount / 100);
                                 const lineTotal = priceAfterDiscount * item.qty;
                                 return (
                                   <TableRow key={item.productId + idx} className="border-b last:border-b-0 hover:bg-transparent">
                                     <TableCell className="font-medium text-[10px]">{globalLp}</TableCell>
                                     <TableCell>
                                       <p className="font-bold text-xs">{p.name}</p>
                                       <p className="text-[9px] text-muted-foreground tracking-tight">{p.sku}</p>
                                     </TableCell>
                                     <TableCell className="text-right text-xs font-medium">{item.qty}</TableCell>
                                     <TableCell className="text-right text-xs">{Number(p.price).toFixed(2)} zł</TableCell>
                                     <TableCell className="text-right text-xs text-destructive font-bold">{item.discount > 0 ? `-${item.discount}%` : '0%'}</TableCell>
                                     <TableCell className="text-right text-xs font-black">{lineTotal.toFixed(2)} zł</TableCell>
                                   </TableRow>
                                 )
                               })}
                             </>
                          )}
                        </React.Fragment>
                      )
                    })
                  })()}
                </TableBody>
              </Table>
              
              <div className="mt-12 flex justify-end">
                <div className="w-72 space-y-1">
                  <div className="flex justify-between text-sm py-1 border-b">
                    <span className="text-muted-foreground">Suma wartości netto:</span>
                    <span className="font-bold">{calculateTotal().toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b">
                    <span className="text-muted-foreground">Podatek VAT (23%):</span>
                    <span className="font-bold">{(calculateTotal() * 0.23).toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-between text-xl font-black pt-4 text-primary">
                    <span>RAZEM BRUTTO:</span>
                    <span>{(calculateTotal() * 1.23).toFixed(2)} zł</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-24 space-y-8">
                <div className="grid grid-cols-2 gap-16">
                   <div className="border-t pt-2 text-center">
                     <p className="text-[9px] uppercase font-bold text-muted-foreground">Pieczątka i podpis wystawiającego</p>
                   </div>
                   <div className="border-t pt-2 text-center">
                     <p className="text-[9px] uppercase font-bold text-muted-foreground">Podpis akceptującego ofertę</p>
                   </div>
                </div>
                <div className="text-[9px] text-muted-foreground text-center leading-relaxed">
                  Powyższa oferta nie stanowi oferty handlowej w rozumieniu art. 66 § 1 Kodeksu Cywilnego. Ceny podlegają zmianom z uwagi na wahania kursów walut. <br/>
                  Termin płatności: wg ustaleń. Ważność oferty: 7 dni od daty wystawienia.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 3: PRODUCT BROWSER (Right) - col-span-3 */}
        <div className="md:col-span-3 flex bg-background rounded-xl border shadow-sm h-[842px] overflow-hidden print:hidden">
          {/* Main area of browser */}
          <div className="flex-1 flex flex-col min-w-0">
             <div className="p-4 border-b space-y-3 bg-muted/5">
                <h3 className="font-bold text-sm tracking-tight">Przeglądaj katalog</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Szukaj urządzenia..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm transition-all focus:ring-1 focus:ring-primary shadow-inner"
                  />
                </div>
             </div>
             
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                 {loading ? (
                    <div className="p-8 text-center text-muted-foreground animate-pulse text-xs">Synchronizacja...</div>
                 ) : (
                   <div className="space-y-6">
                      {categories.find(c => c.id === selectedCategoryId)?.subcategories?.map((sub: any) => (
                        <div key={sub.id} className="space-y-2">
                           <h4 className="text-[10px] font-black uppercase text-primary/60 px-2 tracking-widest flex items-center gap-2">
                              <ChevronRight className="w-3 h-3" /> {sub.name}
                           </h4>
                           <div className="grid gap-1">
                              {products
                                .filter(p => p.categoryId === selectedCategoryId && p.subcategoryId === sub.id && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())))
                                .map(product => (
                                  <div 
                                    key={product.id} 
                                    className="p-3 border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group flex flex-col gap-1"
                                    onClick={() => addLineItem(product.id)}
                                  >
                                     <div className="flex justify-between items-start">
                                        <h4 className="text-[12px] font-bold leading-tight group-hover:text-primary transition-colors">{product.name}</h4>
                                        <Plus className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 shrink-0" />
                                     </div>
                                     <div className="flex justify-between items-end">
                                        <span className="text-[9px] text-muted-foreground font-mono">{product.sku}</span>
                                        <span className="text-xs font-black">{product.price.toFixed(2)} zł</span>
                                     </div>
                                  </div>
                                ))
                              }
                           </div>
                        </div>
                      ))}

                      <div className="space-y-2 pt-2">
                         <h4 className="text-[10px] font-black uppercase text-muted-foreground/60 px-2 tracking-widest">Inne / Nieskategoryzowane</h4>
                         <div className="grid gap-1">
                           {products
                            .filter(p => p.categoryId === selectedCategoryId && !p.subcategoryId && (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())))
                            .map(product => (
                              <div key={product.id} className="p-3 border rounded-lg hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group flex flex-col gap-1" onClick={() => addLineItem(product.id)}>
                                 <div className="flex justify-between items-start">
                                    <h4 className="text-[12px] font-bold leading-tight group-hover:text-primary transition-colors">{product.name}</h4>
                                    <Plus className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 shrink-0" />
                                 </div>
                                 <div className="flex justify-between items-end">
                                    <span className="text-[9px] text-muted-foreground font-mono">{product.sku}</span>
                                    <span className="text-xs font-black">{product.price.toFixed(2)} zł</span>
                                 </div>
                              </div>
                            ))
                           }
                         </div>
                      </div>
                   </div>
                 )}
              </div>
           </div>

           {/* Vertical categories on the right edge */}
           <div className="w-14 border-l bg-muted/20 flex flex-col py-4 gap-2 overflow-y-auto items-center">
              {categories.map(cat => {
                const isActive = selectedCategoryId === cat.id;
                return (
                  <button
                     key={cat.id}
                     onClick={() => setSelectedCategoryId(cat.id)}
                     className={`p-3 rounded-lg transition-all relative group ${isActive ? 'bg-primary text-white shadow-lg' : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'}`}
                     title={cat.name}
                  >
                     {getIcon(cat.iconName)}
                     {!isActive && (
                       <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none mb-1">
                         {cat.name}
                       </div>
                     )}
                  </button>
                )
              })}
           </div>
        </div>
      </div>

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
        }
      `}} />
    </div>
  )
}
