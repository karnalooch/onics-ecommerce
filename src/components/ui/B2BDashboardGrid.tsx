"use client";

import { ShoppingCart, Database, Box, Activity } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";

interface B2BDashboardGridProps {
  nip: string;
  email: string;
}

export function B2BDashboardGrid({ nip, email }: B2BDashboardGridProps) {
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  const handleAddToCart = (id: string, name: string, price: number) => {
    addItem({
      id,
      name,
      price,
      quantity: 1,
      sku: `SKU-B2B-${id}`
    });
    router.push("/koszyk");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      {[1, 2, 3, 4, 5, 6].map((i) => {
        const price = 400 + i * 50;
        const name = `Płyta Główna Asus Z${i}0 (Multi-Pack)`;
        const id = String(i);

        return (
          <div key={id} className="satel-card bg-white p-0 border-none shadow-sm relative group h-full overflow-hidden transition-all active:ring-2 active:ring-primary">
            {/* SECTOR LINE */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-primary transition-colors" />
            
            <div className="p-8 flex flex-col h-full">
               <div className="bg-slate-50 w-full h-44 border-2 border-slate-100 mb-8 flex items-center justify-center relative overflow-hidden group-hover:border-slate-950 transition-colors">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic z-10">[ IMG_NODE_{i} ]</span>
                  <Database className="absolute -bottom-4 -right-4 w-20 h-20 text-slate-200 opacity-20" />
               </div>
               
               <div className="flex flex-col gap-2 mb-6">
                  <div className="flex items-center gap-2">
                     <Box className="w-3.5 h-3.5 text-primary" />
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Inventory_Stock: OK</span>
                  </div>
                  <h3 className="font-black text-xl italic tracking-tighter uppercase text-slate-950 leading-none">{name}</h3>
               </div>

               <div className="bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] p-6 flex flex-col mb-8 border border-white/10 shadow-lg rounded-xl text-white">
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Matryca_B2B_Partner</span>
                     <Activity className="w-3 h-3 text-primary animate-pulse" />
                  </div>
                  <p className="font-black text-white text-3xl tabular-nums italic tracking-tighter leading-none">
                     {price.toFixed(2)} <span className="text-primary text-xs NOT-italic font-bold">PLN_NET</span>
                  </p>
               </div>
               
               <button 
                 onClick={() => handleAddToCart(id, name, price)}
                 className="w-full h-14 bg-gradient-to-r from-primary to-blue-600 text-white font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 hover:brightness-110 transition-all active-press italic shadow-lg shadow-blue-500/40 rounded-md"
               >
                 <ShoppingCart className="w-5 h-5 text-primary" />
                 DODAJ_DO_KOSZYKA
               </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
