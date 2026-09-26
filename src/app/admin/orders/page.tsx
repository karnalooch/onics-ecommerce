"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  ShoppingBag, CalendarClock, Loader2, CheckCircle2, 
  Terminal, Activity, Package, Truck, Search, 
  ChevronRight, MoreHorizontal, FileText, Database,
  ArrowRight, ShieldCheck, RefreshCcw, Box
} from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingOrder, setValidatingOrder] = useState<any | null>(null);

  const [deliveryDays, setDeliveryDays] = useState<string>("5");
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const stripeAmountsLocked = Boolean(validatingOrder?.stripeCheckoutSessionId);
  const stripeRefundInProgress =
    validatingOrder?.refundStatus === "pending" ||
    validatingOrder?.refundStatus === "requires_action";
  const stripeFulfillmentLocked =
    Boolean(validatingOrder?.stripeCheckoutSessionId) &&
    (validatingOrder?.paymentStatus !== "PAID" || stripeRefundInProgress);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      toast.error("FAULT: Błąd synchronizacji potoku zamówień.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openVerificationModal = (order: any) => {
    setValidatingOrder(order);
    setDeliveryDays(order.estimatedDeliveryDays?.toString() || "3");
    setEditableItems((order.items ?? []).map((item: any) => ({ ...item })));
  }

  const updateItemPrice = (index: number, newPrice: string) => {
    if (stripeAmountsLocked) return;

    setEditableItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, price: parseFloat(newPrice) || 0 }
          : item
      )
    );
  }

  const cancelStripeOrder = async () => {
    if (!validatingOrder?.stripeCheckoutSessionId) return;
    if (
      !window.confirm(
        validatingOrder.paymentStatus === "PAID"
          ? "Uruchomić pełny refund Stripe i anulować zamówienie po jego powodzeniu?"
          : "Wygasić sesję Stripe, zwolnić rezerwację i anulować zamówienie?"
      )
    ) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: validatingOrder.id }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok && res.status !== 202) {
        throw new Error(
          data?.error || "Nie udało się anulować zamówienia Stripe."
        );
      }

      if (res.status === 202) {
        toast.success(
          "Refund Stripe został zlecony i oczekuje na końcowe potwierdzenie."
        );
      } else {
        toast.success(
          data?.paymentStatus === "REFUNDED"
            ? "Refund Stripe zakończony. Zamówienie anulowane."
            : "Sesja Stripe wygaszona. Rezerwacja magazynowa zwolniona."
        );
      }

      setValidatingOrder(null);
      await fetchOrders();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "FAULT: Błąd anulowania zamówienia Stripe."
      );
    } finally {
      setCancelling(false);
    }
  }

  const confirmOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: validatingOrder.id,
          status: "CONFIRMED",
          estimatedDeliveryDays: parseInt(deliveryDays),
          items: editableItems
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error || "Nie udało się zapisać weryfikacji zamówienia."
        );
      }

      toast.success("LOG: Zamówienie zweryfikowane. Alert wysłany do klienta.");
      setValidatingOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "FAULT: Błąd zapisu weryfikacji."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-700 pb-20 no-blur max-w-[1920px] mx-auto">
      
      {/* 1. FULFILLMENT STREAM HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-8 border-b-2 border-slate-950 pb-8">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center shadow-xl">
              <ShoppingBag className="w-7 h-7 text-primary" />
           </div>
           <div className="flex flex-col">
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">DHL_FLOW_LOGISTICS</span>
                 <div className="w-8 h-[1px] bg-slate-200" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 leading-none">Order_Pipeline_v7</span>
              </div>
              <h1 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic leading-none mt-1">Potok Rezerwacji B2B</h1>
           </div>
        </div>
        
        <div className="flex items-center gap-6 bg-slate-50 p-2 border border-slate-100 h-14 px-8">
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">OCZEKUJĄCE</span>
              <span className="text-xl font-black text-slate-950 tabular-nums italic mt-1 leading-none">
                 {orders.filter(o => o.status === 'PENDING_VERIFICATION').length}
              </span>
           </div>
           <div className="h-6 w-[1px] bg-slate-200 mx-2" />
           <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">W_LOGISTYCE</span>
              <span className="text-xl font-black text-primary tabular-nums italic mt-1 leading-none">
                 {orders.filter(o => o.status === 'CONFIRMED').length}
              </span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* OPERATIONAL PIPELINE (TABLE) */}
        <div className="xl:col-span-12 space-y-8">
           
           <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none">
              <div className="p-5 border-b border-slate-100 bg-slate-950 flex items-center justify-between text-white">
                 <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-primary" />
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] italic">TRANSACTION_QUEUE_STREAM</h3>
                 </div>
                 <Activity className="w-4 h-4 text-primary animate-pulse" />
              </div>

              <div className="w-full overflow-x-auto">
                 <table className="w-full border-collapse">
                    <thead>
                       <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pl-6 text-left w-20 italic">ID_T</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Typ / Rezerwacja</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-left italic">Podmiot_B2B</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-right italic">Wartość_System</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-right italic">Wartość_Final</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 text-center italic">DHL_Status_Flow</th>
                          <th className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pr-6 text-right italic">Operacja</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {loading ? (
                          <tr>
                             <td colSpan={7} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center opacity-10">
                                   <RefreshCcw className="w-10 h-10 mb-4 animate-spin" />
                                   <span className="text-[11px] font-black uppercase tracking-[0.5em] italic">Syncing_Logistics_Nodes...</span>
                                </div>
                             </td>
                          </tr>
                       ) : orders.length === 0 ? (
                          <tr>
                             <td colSpan={7} className="h-64 text-center text-[11px] font-black text-slate-200 uppercase tracking-[0.4em] italic">Stream_Inactive: Brak_Zamówień</td>
                          </tr>
                       ) : (
                          orders.map((o) => (
                             <tr key={o.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-6 pl-6">
                                   <span className="text-[11px] font-black text-primary italic tabular-nums">#{o.id}</span>
                                </td>
                                <td className="px-6 py-6">
                                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 text-white border border-slate-800">
                                      {o.orderType === "ORDER" ? <Package className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3" />}
                                      <span className="text-[8px] font-black uppercase italic tracking-widest">
                                         {o.orderType === "ORDER" ? "HARD_RESERVATION" : "LIGHT_QUOTE"}
                                      </span>
                                   </div>
                                </td>
                                <td className="px-6 py-6">
                                   <div className="flex flex-col gap-1">
                                      <span className="text-[13px] font-black text-slate-950 uppercase italic tracking-tighter leading-none">{o.user?.companyName || "PARTNER_EXT_ID"}</span>
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{o.user?.email || "N/A"}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-6 text-right">
                                   <span className="text-[11px] font-black text-slate-300 tabular-nums italic line-through decoration-slate-200">{Number(o.totalPriceOrig).toFixed(2)}</span>
                                </td>
                                <td className="px-6 py-6 text-right">
                                   <span className="text-[15px] font-black text-slate-950 tabular-nums italic tracking-tighter">{Number(o.totalPriceFinal).toFixed(2)} <span className="text-[8px] NOT-italic text-slate-400 ml-1">PLN</span></span>
                                </td>
                                <td className="px-6 py-6">
                                   <div className="flex items-center justify-center gap-1">
                                      {[1, 2, 3].map(step => {
                                         const isActive = (step === 1) || (step === 2 && o.status === 'CONFIRMED') || (step === 3 && o.status === 'SHIPPED');
                                         return (
                                            <div key={step} className="flex items-center gap-1">
                                               <div className={`h-2 w-10 ${isActive ? 'bg-primary' : 'bg-slate-100'} skew-x-[-20deg]`} />
                                               {step < 3 && <ArrowRight className={`w-2 h-2 ${isActive ? 'text-primary' : 'text-slate-200'}`} />}
                                            </div>
                                         )
                                      })}
                                   </div>
                                </td>
                                <td className="pr-6 py-6 text-right">
                                   <button 
                                      onClick={() => openVerificationModal(o)}
                                      className={`h-10 px-5 text-[9px] font-black uppercase tracking-widest italic transition-all active-press ${
                                         o.status === "PENDING_VERIFICATION" 
                                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                            : "bg-slate-50 text-slate-400 border border-slate-100"
                                      }`}
                                   >
                                      {o.status === "PENDING_VERIFICATION" ? "VERIFY_NODE" : "VIEW_LOGS"}
                                   </button>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

        </div>
      </div>

      {/* VERIFICATION TERMINAL (MODAL) */}
      <AnimatePresence>
        {validatingOrder && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 no-blur">
              <div className="absolute inset-0 bg-slate-950/70" onClick={() => setValidatingOrder(null)} />
              
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="w-full max-w-[800px] bg-white relative z-10 overflow-hidden shadow-2xl border-none p-0 flex flex-col max-h-[90vh]"
              >
                 <div className="bg-slate-950 px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <ShieldCheck className="w-5 h-5 text-primary" />
                       <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">MODYFIKACJA_PARAMETRÓW_POTOKU</h3>
                    </div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">ORDER_T: #{validatingOrder.id}</div>
                 </div>

                 <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                    
                    {/* LOGISTICS CONFIG */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1 leading-none">Szacowany Czas Realizacji (DHL-DAYS)</label>
                          <div className="flex items-center gap-6 bg-slate-50 p-6 border-l-4 border-primary">
                             <input 
                                type="number" 
                                value={deliveryDays} 
                                onChange={(e) => setDeliveryDays(e.target.value)}
                                className="w-24 h-14 bg-white border border-slate-200 text-center text-4xl font-black text-slate-950 tabular-nums italic outline-none focus:border-primary transition-all"
                                min="1"
                             />
                             <div>
                                <span className="text-[11px] font-black text-slate-950 uppercase italic">DNI_ROBOCZYCH</span>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gwarantowany termin logystyczny</p>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-col justify-end p-6 bg-slate-950 text-white italic">
                          <span className="text-[8px] font-black text-primary uppercase tracking-[0.3em]">Alert_Signal:</span>
                          <p className="text-[10px] font-bold leading-relaxed mt-2 opacity-60">
                             Zatwierdzenie spowoduje natychmiastową wysyłkę certyfikatu weryfikacyjnego do Partnera B2B.
                          </p>
                       </div>
                    </div>

                    {/* ITEM REDEFINITION GRID */}
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.2em] italic border-b border-slate-100 pb-2">Korekta Stawek Indeksowych</h4>
                       {stripeAmountsLocked && (
                          <div className="border-l-4 border-primary bg-primary/5 px-4 py-3">
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                                Kwoty zablokowane przez sesję Stripe. Realizacja jest możliwa dopiero po potwierdzeniu płatności.
                             </p>
                          </div>
                       )}
                       <div className="bg-slate-50 border border-slate-100">
                          <table className="w-full text-left">
                             <thead>
                                <tr className="border-b border-slate-200 bg-slate-100">
                                   <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Indeks / SKU</th>
                                   <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">QTY</th>
                                   <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">System_Price</th>
                                   <th className="p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right pr-6">Override_Price</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-200">
                                {editableItems.map((item, idx) => (
                                   <tr key={idx} className="hover:bg-white transition-colors">
                                      <td className="p-4">
                                         <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-slate-950 uppercase italic truncate max-w-[200px]">{item.name}</span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</span>
                                         </div>
                                      </td>
                                      <td className="p-4 text-center font-black text-[12px] italic tabular-nums">{item.quantity} PCS</td>
                                      <td className="p-4 text-right text-[11px] font-bold text-slate-400 tabular-nums">{item.price?.toFixed(2)}</td>
                                      <td className="p-4 text-right pr-6">
                                         <input 
                                            type="number" 
                                            value={item.price}
                                            onChange={(e) => updateItemPrice(idx, e.target.value)}
                                            disabled={stripeAmountsLocked}
                                            className={`w-28 h-10 bg-white border border-slate-200 text-right px-4 text-sm font-black italic outline-none transition-all tabular-nums ${
                                               stripeAmountsLocked
                                                  ? "cursor-not-allowed text-slate-400 opacity-60"
                                                  : "text-primary focus:border-primary"
                                            }`}
                                            step="0.01"
                                         />
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>

                    {/* VALUATION SYNOPSIS */}
                    <div className="flex justify-end pt-6 border-t-2 border-slate-950">
                       <div className="w-[300px] space-y-2">
                          <div className="flex justify-between items-baseline">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">VAL_BASE_TOTAL:</span>
                             <span className="text-[13px] font-black text-slate-400 tabular-nums">{validatingOrder.totalPriceOrig?.toFixed(2)} PLN</span>
                          </div>
                          <div className="flex justify-between items-end pt-4">
                             <span className="text-[13px] font-black text-primary uppercase italic tracking-widest">VAL_OVERRIDE:</span>
                             <div className="flex items-baseline gap-2 leading-none">
                                <span className="text-[32px] font-black text-primary tabular-nums italic tracking-tighter leading-none">
                                   {editableItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 NOT-italic">PLN</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {stripeFulfillmentLocked && (
                    <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
                       <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                          {stripeRefundInProgress
                            ? `Refund Stripe jest w toku (${validatingOrder?.refundStatus}). Zamówienia nie można przekazać do logistyki.`
                            : `Oczekiwanie na płatność Stripe (${validatingOrder?.paymentStatus || "PENDING"}). Zamówienia nie można jeszcze przekazać do logistyki.`}
                       </p>
                    </div>
                 )}
                 <div className="p-6 bg-slate-950 flex items-center gap-4">
                    {validatingOrder?.stripeCheckoutSessionId &&
                     validatingOrder?.status !== "CANCELLED" &&
                     validatingOrder?.status !== "SHIPPED" && (
                       <button
                         onClick={cancelStripeOrder}
                         disabled={
                           cancelling ||
                           validatingOrder?.refundStatus === "pending" ||
                           validatingOrder?.refundStatus === "requires_action"
                         }
                         className="flex-1 h-14 border-2 border-red-400/40 text-red-300 font-black text-[10px] uppercase tracking-widest hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all italic"
                       >
                         {cancelling
                           ? "ANULOWANIE..."
                           : validatingOrder?.refundStatus === "pending" ||
                               validatingOrder?.refundStatus === "requires_action"
                             ? "REFUND_W_TOKU"
                             : validatingOrder?.paymentStatus === "PAID"
                               ? "ANULUJ_I_REFUND"
                               : "ANULUJ_PŁATNOŚĆ"}
                       </button>
                    )}
                    <button 
                       onClick={() => setValidatingOrder(null)}
                       className="flex-1 h-14 border-2 border-white/20 text-white font-black text-[11px] uppercase tracking-widest hover:border-white transition-all active-press italic"
                    >
                       ZAMKNIJ
                    </button>
                    <button 
                       onClick={confirmOrder}
                       disabled={saving || cancelling || stripeFulfillmentLocked}
                       className={`flex-1 h-14 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 transition-all italic ${
                          saving || stripeFulfillmentLocked
                             ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                             : "bg-primary text-slate-950 shadow-xl shadow-primary/20 hover:brightness-110 active-press"
                       }`}
                    >
                       {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                       {saving
                          ? "PROPAGACJA_PARAMETRÓW..."
                          : stripeFulfillmentLocked
                            ? stripeRefundInProgress
                              ? "REFUND_W_TOKU"
                              : "OCZEKIWANIE_NA_PŁATNOŚĆ"
                            : "ZATWIERDŹ_DO_LOGISTYKI"}
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  )
}
