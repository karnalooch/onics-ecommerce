// src/app/sklep/_components/MiniCart.tsx
"use client";

import { ShoppingBag, X, ArrowRight, Wallet } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function MiniCart({ isB2B }: { isB2B: boolean }) {
  const router = useRouter();
  const { items: cart, removeItem, getTotalItems, getTotalPrice } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 h-40 flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  const cartCount = getTotalItems();
  const total = getTotalPrice();

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 sticky top-28 flex flex-col max-h-[calc(100vh-160px)]">
       <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-primary/10 rounded-2xl relative">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
             </div>
             <h3 className="font-black text-slate-800 uppercase tracking-tight italic">Twój <span className="text-primary italic">Zestaw</span></h3>
          </div>
       </div>

       {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-30 gap-4">
             <ShoppingBag className="w-12 h-12" />
             <p className="text-[10px] font-black uppercase tracking-widest italic">Pusty Magazynek</p>
          </div>
       ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
               {cart.map(item => (
                 <div key={item.id} className="group flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                    <div className="flex-1">
                       <h4 className="text-[11px] font-black text-slate-700 leading-tight uppercase tracking-tight mb-1">{item.name}</h4>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary">x{item.quantity}</span>
                          <span className="text-[10px] text-slate-300 font-bold">•</span>
                          <span className="text-[10px] font-bold text-slate-400">{item.price.toFixed(2)} zł</span>
                       </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                       <X className="w-4 h-4" />
                    </button>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-8 border-t-2 border-slate-50 space-y-6">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Wartość Razem</span>
                  <div className="flex flex-col items-end">
                     <span className="text-xl font-black text-slate-900 tracking-tight">{total.toFixed(2)} zł</span>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Netto + VAT</span>
                  </div>
               </div>

               <Button 
                 onClick={() => router.push('/koszyk')}
                 className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] gap-3 shadow-xl"
               >
                 Finalizuj Wybór <ArrowRight className="w-4 h-4" />
               </Button>
            </div>
          </>
       )}
    </div>
  );
}
