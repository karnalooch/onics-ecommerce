"use client"

import React, { useEffect, useState, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, Printer, Plus, Trash2, Search, 
  ChevronRight, LayoutGrid, Package, UserCircle, Settings, Layers, Briefcase,
  Terminal, ShieldCheck, Activity, Download, RefreshCcw, Box
} from "lucide-react"
import { toast } from "sonner"

export default function QuotesGenerator() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<{productId: string, qty: number, discount: number}[]>([]);
  const [clientInfo, setClientInfo] = useState({ name: "KLIENT_TEST_B2B", nip: "000-000-00-00" });
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

      setRefNumber(`CPQ/ENGINE/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000) + 1000}`);
      setQuoteDate(new Date().toLocaleDateString("pl-PL"));
    } catch (e) {
      toast.error("FAULT: Błąd synchronizacji baz danych.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addLineItem = (productId: string) => {
    setItems([...items, { productId, qty: 1, discount: 0 }]);
    toast.success("LOG: Dodano indeks do kolejki wyceny.");
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }

  const updateItem = (index: number, field: string, val: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  }

  const getProduct = (id: string) => products.find(p => p.id === id) || { name: "MODUŁ_NIEZNANY", price: 0, sku: "ERROR_404" };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const p = getProduct(item.productId);
      return sum + (p.price * (1 - item.discount / 100)) * item.qty;
    }, 0);
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 select-none no-blur max-w-[1920px] mx-auto print:m-0">
      
      {/* 1. OPERATIONAL CPQ HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-8 border-b-2 border-slate-950 pb-8 print:hidden">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-none shadow-xl">
              <Terminal className="w-7 h-7 text-primary" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">SYS_CPQ_ENGINE</span>
                 <div className="w-8 h-[1px] bg-slate-200" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Blueprint_Gen_v9</span>
              </div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Konfigurator Ofert</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setItems([])} 
             className="h-11 px-6 bg-white border border-slate-950 text-slate-950 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all active-press italic"
           >
              Wyczyść_Bufor
           </button>
           <button 
             onClick={() => window.print()} 
             className="h-11 px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-4 active-press transition-all hover:bg-primary shadow-xl shadow-primary/10 italic rounded-none"
           >
              <Printer className="w-4 h-4 text-primary" /> EXPORT_BLUEPRINT_PDF
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 print:block">
        
        {/* LEFT_NODE: PARAMETER CONTROLS */}
        <aside className="xl:col-span-3 space-y-8 print:hidden">
           
           {/* PARTNER CONTEXT CARD */}
           <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-950 italic">Identyfikacja_Partnera</h3>
              </div>
              <div className="p-6 space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Nazwa Podmiotu B2B</label>
                    <input 
                       type="text" 
                       value={clientInfo.name}
                       onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                       className="w-full h-11 bg-slate-50 border border-slate-100 px-4 text-[12px] font-black uppercase italic outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">NIP_TRANS_ID</label>
                    <input 
                       type="text" 
                       value={clientInfo.nip}
                       onChange={(e) => setClientInfo({...clientInfo, nip: e.target.value})}
                       className="w-full h-11 bg-slate-50 border border-slate-100 px-4 text-[12px] font-mono font-bold outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                    />
                 </div>
              </div>
           </div>

           {/* OPERATIONAL QUEUE (BASKET) */}
           <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none shadow-sm flex flex-col min-h-[500px]">
              <div className="p-4 bg-slate-950 flex justify-between items-center text-white">
                 <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Operational_Buffer</span>
                 </div>
                 <div className="h-6 px-3 bg-white/10 text-primary text-[9px] font-black flex items-center tabular-nums">{items.length} PCS</div>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                 {items.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center opacity-20">
                       <Briefcase className="w-10 h-10 mb-4" />
                       <span className="text-[9px] font-black uppercase tracking-[0.4em] italic">Buffer_Empty</span>
                    </div>
                 ) : (
                    items.map((item, idx) => {
                       const p = getProduct(item.productId);
                       return (
                          <div key={idx} className="p-5 bg-white group hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-primary">
                             <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[12px] font-black text-slate-950 uppercase truncate leading-none italic">{p.name}</span>
                                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{p.sku}</span>
                                </div>
                                <button onClick={() => removeLineItem(idx)} className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-red-600 transition-colors active-press">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex-1">
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ilość</span>
                                   <input 
                                      type="number" 
                                      value={item.qty} 
                                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                                      className="w-full h-9 bg-slate-50 border border-transparent px-3 text-[11px] font-black outline-none focus:bg-white focus:border-primary transition-all tabular-nums"
                                   />
                                </div>
                                <div className="flex-1">
                                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rabat_%</span>
                                   <input 
                                      type="number" 
                                      value={item.discount} 
                                      onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))}
                                      className="w-full h-9 bg-slate-50 border border-transparent px-3 text-[11px] font-black text-primary outline-none focus:bg-white focus:border-primary transition-all tabular-nums"
                                   />
                                </div>
                             </div>
                          </div>
                       )
                    })
                 )}
              </div>

              <div className="p-8 bg-slate-950 text-white border-t border-white/5 mt-auto">
                 <div className="flex justify-between items-end mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">VAL_NET_AGGREGATE</span>
                    <span className="text-3xl font-black italic tracking-tighter tabular-nums leading-none">
                       {calculateTotal().toFixed(2)} <span className="text-[10px] NOT-italic opacity-40">PLN</span>
                    </span>
                 </div>
                 <div className="flex items-center gap-2 mt-4 text-[8px] font-black text-primary uppercase tracking-[0.3em] italic">
                    <ShieldCheck className="w-3 h-3" /> System_Calibrated_OK
                 </div>
              </div>
           </div>

        </aside>

        {/* CENTER_NODE: VISUAL BLUEPRINT (PDF VIEW) */}
        <main className="xl:col-span-6 print:w-full">
           <div className="bg-white min-h-[1100px] shadow-2xl flex flex-col p-16 print:p-0 print:border-none print:shadow-none relative rounded-none border border-slate-50">
              
              {/* OPERATIONAL WATERMARK */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 pointer-events-none opacity-[0.03]">
                 <span className="text-[140px] font-black text-slate-950 uppercase tracking-[0.1em] whitespace-nowrap italic">DOKUMENT_PROCEDURALNY</span>
              </div>

              {/* PDF_BLUEPRINT_HEADER */}
              <div className="flex justify-between items-start border-b-[5px] border-slate-950 pb-10 relative z-10">
                 <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center font-black italic text-xl">CT</div>
                       <span className="text-3xl font-black tracking-tighter italic uppercase text-slate-950">CEL-TRONICS</span>
                    </div>
                    <div className="flex flex-col mt-4">
                       <h1 className="text-5xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">BLUEPRINT_OFFER</h1>
                       <div className="flex items-center gap-3 mt-4">
                          <span className="text-[12px] font-black text-primary uppercase tracking-[0.4em] italic">{refNumber}</span>
                          <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{quoteDate}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="text-right flex flex-col gap-1 items-end">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 italic">Provider_Node:</span>
                    <span className="text-lg font-black text-slate-950 uppercase tracking-tighter">Celtronics S.C.</span>
                    <span className="text-[11px] font-black text-slate-950 tracking-widest">NIP: 123-456-78-90</span>
                    <span className="text-[11px] font-black text-primary italic tracking-widest mt-2 underline decoration-2 underline-offset-4">BIURO@CELTRONICS.PL</span>
                 </div>
              </div>

              {/* TARGET_CONTEXT */}
              <div className="grid grid-cols-2 gap-16 mt-16 py-10 border-b border-slate-50 relative z-10">
                 <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Authorized_Recipient</span>
                    <span className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter leading-tight">{clientInfo.name}</span>
                    <span className="text-[13px] font-black text-slate-500 tracking-[0.2em]">IDENT_ID: {clientInfo.nip}</span>
                 </div>
                 <div className="bg-slate-950/2 p-8 flex flex-col justify-center border-l-8 border-primary">
                    <p className="text-[11px] font-black text-slate-950 uppercase leading-relaxed tracking-wider italic">
                       Projekcja techniczna przygotowana w systemie <span className="text-primary font-black italic">ELITE_CPQ</span>. 
                       Wszystkie kwoty wyrażone w PLN_NET. Termin ważności blueprintu: 7 Dni Operacyjnych.
                    </p>
                 </div>
              </div>

              {/* EXECUTION_GRID_TABLE */}
              <div className="mt-16 flex-1 relative z-10 overflow-hidden">
                 <Table>
                    <TableHeader className="bg-slate-50">
                       <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-5 pl-6 w-16">ID_N</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-5 px-6">SPECYFIKACJA_URZĄDZENIA</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-5 text-center w-24">QTY</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-5 text-right pr-6 w-40">VALUE_NET</TableHead>
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
                                   <span className="text-[13px] font-black uppercase tracking-[0.6em] italic">NO_DATA_POINTS_COLLECTED</span>
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
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">SUM_NET_TOTAL:</span>
                          <span className="text-[18px] font-black text-slate-950 tabular-nums italic">{calculateTotal().toFixed(2)} PLN</span>
                       </div>
                       <div className="flex justify-between items-baseline py-3 border-b border-slate-50">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">VAT_TAX_PROJECTION (23%):</span>
                          <span className="text-[18px] font-black text-slate-950 tabular-nums italic">{(calculateTotal() * 0.23).toFixed(2)} PLN</span>
                       </div>
                       <div className="flex justify-between items-baseline pt-6 border-t border-slate-950 h-20">
                          <span className="text-[16px] font-black text-primary uppercase italic tracking-[0.3em]">TOTAL_GROSS_VAL:</span>
                          <div className="flex flex-col items-end leading-none">
                             <span className="text-[38px] font-black text-primary tabular-nums tracking-tighter italic leading-none">
                                {(calculateTotal() * 1.23).toFixed(2)}
                             </span>
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Currency: PLN_OFFICIAL</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* AUTH_SIGNATURES */}
              <div className="mt-auto pt-24 grid grid-cols-2 gap-24 relative z-10">
                 <div className="border-t-2 border-slate-950 pt-6 flex flex-col gap-2 items-center">
                    <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] italic">Authorized_Agent_ID</span>
                    <span className="text-[13px] font-black text-slate-950 italic tracking-tighter">PLATFORMA_B2B_ENG_CORE</span>
                 </div>
                 <div className="border-t-2 border-slate-950 pt-6 flex flex-col gap-2 items-center">
                    <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em] italic">Business_Partner_Stamp</span>
                    <span className="text-[13px] font-black text-slate-950 italic tracking-tighter">___________________________</span>
                 </div>
              </div>

           </div>
        </main>

        {/* RIGHT_NODE: PIM INDICES SCANNER */}
        <aside className="xl:col-span-3 space-y-8 print:hidden">
           
           <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none shadow-sm flex flex-col h-[940px]">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col gap-6">
                 <div className="flex items-center gap-4">
                    <Search className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">PIM_Registry_Scanner</span>
                 </div>
                 <div className="relative group">
                    <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
                    <input 
                       type="text" 
                       placeholder="SEARCH_INDEX_OR_MODEL..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full h-12 bg-white border border-slate-100 pl-12 pr-4 text-[11px] font-black uppercase tracking-widest italic outline-none focus:border-primary transition-all shadow-sm"
                    />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-50 custom-scrollbar">
                 {loading ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center text-slate-200">
                       <RefreshCcw className="w-10 h-10 mb-4 animate-spin" />
                       <span className="text-[10px] font-black uppercase tracking-widest italic">LOADING_INDICES...</span>
                    </div>
                 ) : (
                    products
                      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 100)
                      .map((p) => (
                       <button 
                         key={p.id} 
                         onClick={() => addLineItem(p.id)}
                         className="w-full p-5 bg-white hover:bg-slate-50 text-left transition-all active-press border-l-4 border-transparent hover:border-primary flex flex-col gap-2 group"
                       >
                          <div className="flex justify-between items-start">
                             <span className="text-[13px] font-black text-slate-950 uppercase italic leading-none group-hover:text-primary transition-colors">{p.name}</span>
                             <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex justify-between items-baseline mt-2">
                             <span className="text-[9px] font-black text-slate-300 font-mono tracking-widest leading-none">{p.sku}</span>
                             <div className="flex flex-col items-end">
                                <span className="text-[13px] font-black text-slate-950 tabular-nums italic leading-none">{p.price.toFixed(2)}</span>
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">PLN_NET</span>
                             </div>
                          </div>
                       </button>
                    ))
                 )}
              </div>
              
              <div className="p-5 bg-slate-950 text-white flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] italic">Database_PIM: ONLINE</span>
                 </div>
                 <Layers className="w-4 h-4 text-primary" />
              </div>
           </div>

        </aside>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          header, nav, .print\\:hidden, aside { display: none !important; }
          .satel-card { border: none !important; box-shadow: none !important; }
          main { width: 100% !important; margin: 0 !important; border: none !important; }
          .print\\:block { display: block !important; }
          .mx-auto { margin: 0 !important; }
          .max-w-screen-xl { max-width: 100% !important; }
        }
      `}} />
    </div>
  )
}
