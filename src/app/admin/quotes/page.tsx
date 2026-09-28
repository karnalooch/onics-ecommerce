"use client"

import { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Printer,
  Plus,
  Trash2,
  Search,
  Briefcase,
  Terminal,
  ShieldCheck,
  RefreshCcw,
  Box,
  Zap,
  Globe,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { COMPANY_PUBLIC } from "@/lib/company"

export default function QuotesGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<{productId: string, qty: number, discount: number}[]>([]);
  const [clientInfo, setClientInfo] = useState({ name: "", nip: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [quoteDate, setQuoteDate] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [cRes, pRes, uRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products"),
        fetch("/api/users")
      ]);

      const [cats, prods, users] = await Promise.all([
        cRes.json().catch(() => []),
        pRes.json().catch(() => []), 
        uRes.json().catch(() => [])
      ]);
      setCategories(cats);
      setProducts(prods);
      setClients(users.filter((u: any) => u.roleType === "BIZ"));

      setRefNumber(`OFERTA/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000) + 1000}`);
      setQuoteDate(new Date().toLocaleDateString("pl-PL"));
    } catch (e) {
      toast.error("Nie udało się pobrać danych do oferty.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const addLineItem = (productId: string) => {
    setItems([...items, { productId, qty: 1, discount: 0 }]);
    toast.success("Dodano produkt do oferty.");
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }

  const updateItem = (index: number, field: "qty" | "discount", val: number) => {
    const newItems = [...items];
    if (field === "qty") {
      newItems[index].qty = Math.max(1, Math.min(10000, Math.trunc(val) || 1));
    } else {
      newItems[index].discount = Math.max(0, Math.min(100, val || 0));
    }
    setItems(newItems);
  }

  const getProduct = (id: string) => products.find(p => p.id === id) || { name: "Nieznany produkt", price: 0, sku: "BRAK SKU" };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const p = getProduct(item.productId);
      return sum + (p.price * (1 - item.discount / 100)) * item.qty;
    }, 0);
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12 print:m-0">
      
      {/* 1. OPERATIONAL CPQ HEADER (FLUENT) */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--ops-border)] pb-6 lg:flex-row lg:items-end print:hidden">
        <div className="flex items-center gap-6">
           <div className="hidden">
              <Terminal className="w-8 h-8" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Oferty i wyceny</span>
                 <span className="w-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full" />
                 <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Generator oferty</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Nowa oferta</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setItems([])} 
             className="h-14 px-8 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase text-[11px] tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-sm"
           >
              Wyczyść pozycje
           </button>
           <button 
             onClick={() => window.print()} 
             className="h-14 px-10 bg-primary text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-4 active:scale-95 transition-all hover:brightness-110 shadow-xl shadow-primary/20 rounded-xl"
           >
              <Printer className="w-4 h-4" /> Drukuj / eksportuj
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 print:block">
        
        {/* LEFT_NODE: PARAMETER CONTROLS */}
        <aside className="xl:col-span-3 space-y-8 print:hidden">
           
           {/* PARTNER CONTEXT CARD */}
           <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-0 border-white/10 overflow-hidden ">
              <div className="bg-primary/5 px-8 py-5 border-b border-black/5 dark:border-white/10">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Dane klienta</h3>
              </div>
              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none ml-1">Nazwa firmy</label>
                    <input 
                       type="text" 
                       value={clientInfo.name}
                       onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                       className="w-full h-12 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-5 text-[13px] font-bold outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none ml-1">NIP</label>
                    <input 
                       type="text" 
                       value={clientInfo.nip}
                       onChange={(e) => setClientInfo({...clientInfo, nip: e.target.value})}
                       className="w-full h-12 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-5 text-[13px] font-mono font-bold outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                    />
                 </div>
              </div>
           </div>

           {/* OPERATIONAL QUEUE (BASKET) */}
           <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-0 border-white/10 overflow-hidden  flex flex-col min-h-[500px]">
              <div className="p-5 bg-primary px-8 lg:px-5 flex justify-between items-center text-white">
                 <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-white animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Pozycje oferty</span>
                 </div>
                 <Badge variant="outline" className="bg-white/20 text-white border-transparent font-black tracking-widest">{items.length} ELT</Badge>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 custom-scrollbar">
                 {items.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center opacity-20">
                       <Briefcase className="w-12 h-12 mb-4 text-primary" />
                       <span className="text-[11px] font-bold uppercase tracking-widest">Brak pozycji</span>
                    </div>
                 ) : (
                    items.map((item, idx) => {
                       const p = getProduct(item.productId);
                       return (
                          <div key={idx} className="p-6 bg-white dark:bg-[#1e2335]/50 group hover:bg-primary/5 transition-all border-l-4 border-transparent hover:border-primary">
                             <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[14px] font-extrabold text-foreground leading-none">{p.name}</span>
                                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 opacity-60">{p.sku}</span>
                                </div>
                                <button onClick={() => removeLineItem(idx)} className="w-9 h-9 flex items-center justify-center text-muted-foreground/30 hover:text-red-500 transition-all active:scale-90 bg-black/5 dark:bg-white/5 rounded-lg">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                   <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sztuk</span>
                                   <input 
                                      type="number" 
                                      value={item.qty} 
                                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                                      className="w-full h-11 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-4 text-[13px] font-extrabold outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all tabular-nums shadow-inner"
                                   />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                   <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Rabat %</span>
                                   <input 
                                      type="number" 
                                      value={item.discount} 
                                      onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))}
                                      className="w-full h-11 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-4 text-[13px] font-extrabold text-primary outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all tabular-nums shadow-inner"
                                   />
                                </div>
                             </div>
                          </div>
                       )
                    })
                 )}
              </div>

              <div className="p-10 bg-primary/5 dark:bg-white/5 border-t border-black/5 dark:border-white/10 mt-auto">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wartość netto</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-extrabold text-foreground tabular-nums tracking-tighter leading-none">
                          {calculateTotal().toFixed(2)}
                       </span>
                       <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">PLN</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 mt-6 text-[10px] font-bold text-green-500 uppercase tracking-widest opacity-80">
                    <ShieldCheck className="w-4 h-4 shadow-lg shadow-green-500/20" /> Podsumowanie wyliczone
                 </div>
              </div>
           </div>

        </aside>

        {/* CENTER_NODE: VISUAL BLUEPRINT (MODERNIZED VIEW) */}
        <main className="xl:col-span-6 print:w-full">
           <div className="bg-white min-h-[1100px]  flex flex-col p-16 print:p-0 print:border-none print:shadow-none relative rounded-xl border border-black/5 dark:border-white/10 print:rounded-none overflow-hidden text-slate-900">
              
              {/* OPERATIONAL WATERMARK */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 pointer-events-none opacity-[0.03]">
                 <span className="text-[140px] font-black text-slate-950 uppercase tracking-[0.1em] whitespace-nowrap italic">OFERTA</span>
              </div>

              {/* PDF_BLUEPRINT_HEADER */}
              <div className="flex justify-between items-start border-b-[5px] border-slate-950 pb-10 relative z-10">
                 <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center font-black italic text-xl">CT</div>
                       <span className="text-3xl font-black tracking-tighter italic uppercase text-slate-950">CEL-TRONICS</span>
                    </div>
                    <div className="flex flex-col mt-4">
                       <h1 className="text-5xl font-extrabold tracking-tighter leading-none uppercase italic">Oferta</h1>
                       <div className="flex items-center gap-4 mt-6">
                          <Badge className="bg-primary/10 text-primary border-transparent font-bold tracking-widest px-4 py-1.5 uppercase text-[12px]">{refNumber}</Badge>
                          <div className="w-2 h-2 bg-slate-200 rounded-full" />
                          <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">{quoteDate}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="text-right flex flex-col gap-2 items-end">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Dostawca Systemu:</span>
                    <span className="text-xl font-extrabold tracking-tight">{COMPANY_PUBLIC.shortName}</span>
                    {COMPANY_PUBLIC.nip && <span className="text-[12px] font-bold text-slate-600 tracking-wider">NIP: {COMPANY_PUBLIC.nip}</span>}
                    <span className="text-[12px] font-bold text-primary tracking-widest mt-3 underline decoration-4 underline-offset-4 decoration-primary/20 italic">{COMPANY_PUBLIC.email.toUpperCase()}</span>
                 </div>
              </div>

              {/* TARGET_CONTEXT */}
              <div className="grid grid-cols-2 gap-20 mt-20 py-12 border-b border-slate-100 relative z-10">
                 <div className="flex flex-col gap-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Odbiorca Dokumentu</span>
                    <span className="text-3xl font-extrabold tracking-tight leading-none uppercase italic">{clientInfo.name}</span>
                    <span className="text-[14px] font-bold text-slate-500 tracking-wider font-mono">IDENT_ID: {clientInfo.nip}</span>
                 </div>
                 <div className="bg-primary/5 p-10 flex flex-col justify-center border-l-8 border-primary rounded-r-2xl">
                    <p className="text-[12px] font-bold uppercase leading-relaxed tracking-wider opacity-80 italic">
                       Projekt wyceny wygenerowany przez konfigurator CEL-TRONICS. Wszystkie kwoty wyrażone są w PLN netto.
                       Dokument pozostaje projektem do czasu zatwierdzenia warunków handlowych przez CEL-TRONICS.
                    </p>
                 </div>
              </div>

              {/* EXECUTION_GRID_TABLE */}
              <div className="mt-16 flex-1 relative z-10 overflow-hidden">
                 <Table>
                    <TableHeader className="bg-slate-50 border-b-2 border-slate-900">
                       <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[11px] font-bold text-slate-900 uppercase tracking-widest py-6 pl-8 w-24">Nr_Indeks</TableHead>
                          <TableHead className="text-[11px] font-bold text-slate-900 uppercase tracking-widest py-6 px-6">Specyfikacja Techniczna / Urządzenie</TableHead>
                          <TableHead className="text-[11px] font-bold text-slate-900 uppercase tracking-widest py-6 text-center w-24">Ilość</TableHead>
                          <TableHead className="text-[11px] font-bold text-slate-900 uppercase tracking-widest py-6 text-right pr-8 w-44">Wartość netto</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {items.map((item, idx) => {
                          const p = getProduct(item.productId);
                          const lineTotal = (p.price * (1 - item.discount / 100)) * item.qty;
                          return (
                             <TableRow key={idx} className="border-b last:border-0 border-slate-100 group hover:bg-slate-50/50 transition-colors">
                                <TableCell className="text-[12px] font-black text-slate-300 py-8 pl-6 italic">{idx + 1}.</TableCell>
                                <TableCell className="px-6">
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[15px] font-black text-slate-950 uppercase tracking-tighter italic leading-none">{p.name}</span>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{p.sku}</span>
                                   </div>
                                </TableCell>
                                <TableCell className="text-center font-black text-slate-950 text-base tabular-nums italic">{item.qty}</TableCell>
                                <TableCell className="text-right pr-6 font-black text-slate-950 text-base tabular-nums italic">
                                   {lineTotal.toFixed(2)}
                                </TableCell>
                             </TableRow>
                          )
                       })}
                       {items.length === 0 && (
                          <TableRow>
                             <TableCell colSpan={4} className="h-96 text-center">
                                <div className="flex flex-col items-center justify-center opacity-10">
                                   <Box className="w-16 h-16 mb-4" />
                                   <span className="text-[13px] font-black uppercase tracking-[0.6em] italic">Brak pozycji w ofercie</span>
                                </div>
                             </TableCell>
                          </TableRow>
                       )}
                    </TableBody>
                 </Table>
              </div>

              {/* CORE_SUMMARY_TOTALS */}
              <div className="mt-16 pt-16 border-t-4 border-slate-950 relative z-10">
                 <div className="flex justify-end">
                    <div className="w-[380px] space-y-4">
                       <div className="flex justify-between items-baseline py-3 border-b border-slate-50">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Netto:</span>
                          <span className="text-[18px] font-black text-slate-950 tabular-nums italic">{calculateTotal().toFixed(2)} PLN</span>
                       </div>
                       <div className="flex justify-between items-baseline py-3 border-b border-slate-50">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">VAT 23%:</span>
                          <span className="text-[18px] font-black text-slate-950 tabular-nums italic">{(calculateTotal() * 0.23).toFixed(2)} PLN</span>
                       </div>
                       <div className="flex justify-between items-baseline pt-6 border-t border-slate-950 h-20">
                          <span className="text-[16px] font-black text-primary uppercase italic tracking-[0.3em]">Brutto:</span>
                          <div className="flex flex-col items-end leading-none">
                             <span className="text-[38px] font-black text-primary tabular-nums tracking-tighter italic leading-none">
                                {(calculateTotal() * 1.23).toFixed(2)}
                             </span>
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">PLN</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* AUTH_SIGNATURES */}
              <div className="mt-auto pt-32 grid grid-cols-2 gap-32 relative z-10">
                 <div className="border-t-[3px] border-slate-200 pt-8 flex flex-col gap-3 items-center">
                    <span className="text-[11px] font-bold uppercase text-slate-300 tracking-[0.4em]">Sporządził</span>
                    <span className="text-[14px] font-bold text-slate-900 tracking-tight uppercase">CEL-TRONICS</span>
                 </div>
                 <div className="border-t-[3px] border-slate-200 pt-8 flex flex-col gap-3 items-center">
                    <span className="text-[11px] font-bold uppercase text-slate-300 tracking-[0.4em]">Pieczęć Partnera</span>
                    <span className="text-[14px] font-bold text-slate-300 tracking-widest uppercase">Miejsce na pieczęć</span>
                 </div>
              </div>

           </div>
        </main>

        {/* RIGHT_NODE: PIM INDICES SCANNER (FLUENT) */}
        <aside className="xl:col-span-3 space-y-8 print:hidden">
           
           <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] p-0 border-white/10 overflow-hidden  flex flex-col h-[1000px]">
              <div className="p-8 bg-primary/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10 flex flex-col gap-8">
                 <div className="flex items-center gap-4">
                    <Search className="w-5 h-5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Katalog produktów</span>
                 </div>
                 <div className="relative group">
                    <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <input 
                       type="text" 
                       placeholder="Szukaj po modelu lub SKU..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full h-14 bg-black/5 dark:bg-white/5 border border-transparent rounded-xl pl-12 pr-4 text-[13px] font-medium outline-none focus:bg-white dark:focus:bg-white/10 focus:border-primary/20 transition-all shadow-inner"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {loading ? (
                    <div className="p-24 text-center flex flex-col items-center justify-center text-muted-foreground">
                       <RefreshCcw className="w-12 h-12 mb-6 animate-spin opacity-20" />
                       <span className="text-[11px] font-bold uppercase tracking-widest">Inicjalizacja...</span>
                    </div>
                 ) : (
                    products
                       .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                       .slice(0, 100)
                       .map((p) => (
                        <button 
                          key={p.id} 
                          onClick={() => addLineItem(p.id)}
                          className="w-full p-6 bg-white dark:bg-white/5 hover:bg-primary/5 rounded-2xl text-left transition-all active:scale-[0.98] border border-black/5 dark:border-white/5 hover:border-primary/20 group relative overflow-hidden backdrop-blur-sm"
                        >
                           <div className="flex justify-between items-start relative z-10">
                              <span className="text-[14px] font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors pr-8 uppercase italic">{p.name}</span>
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                 <Plus className="w-5 h-5" />
                              </div>
                           </div>
                           <div className="flex justify-between items-end mt-4 relative z-10">
                              <Badge variant="outline" className="text-[9px] font-mono font-bold tracking-widest border-black/5 dark:border-white/10 px-2 py-0.5 opacity-60">{p.sku}</Badge>
                              <div className="flex flex-col items-end">
                                 <span className="text-[15px] font-extrabold text-foreground tabular-nums leading-none italic">{(p.price ?? 0).toFixed(2)}</span>
                                 <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">PLN Netto</span>
                              </div>
                           </div>
                        </button>
                     ))
                 )}
              </div>
              
              <div className="p-6 bg-primary text-white flex items-center justify-between ">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-glow" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Katalog dostępny</span>
                 </div>
                 <Globe className="w-5 h-5 opacity-60" />
              </div>
           </div>
        </aside>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; color: black !important; }
          header, nav, .print\\:hidden, aside { display: none !important; }
          .rounded-xl border border-[var(--ops-border)] bg-[var(--ops-panel)] { border: none !important; box-shadow: none !important; background: transparent !important; }
          main { width: 100% !important; margin: 0 !important; border: none !important; }
          main > div { shadow: none !important; border: none !important; padding: 0 !important; }
          .mx-auto { margin: 0 !important; }
          .max-w-[1920px] { max-width: 100% !important; }
        }
      `}} />
    </div>
  )
}
