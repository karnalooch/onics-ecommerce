"use client";

import { ShoppingCart } from "lucide-react";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => {
        const price = 400 + i * 50;
        const name = `Płyta Główna Asus Z${i}0 (Multi-Pack)`;
        const id = String(i);

        return (
          <div key={id} className="border border-border p-8 rounded-[2rem] bg-card shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all animate-in fade-in zoom-in duration-500 group">
            <div className="bg-muted w-full h-40 rounded-2xl mb-6 flex items-center justify-center text-muted-foreground text-xs font-black uppercase tracking-widest border border-border/50 group-hover:bg-primary/5 transition-colors">
              [HURT_IMG_{i}]
            </div>
            <h3 className="font-extrabold text-xl mb-3 leading-tight tracking-tight text-foreground">{name}</h3>
            <div className="flex flex-col mb-8 p-4 bg-muted/50 rounded-2xl border border-border/50">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Stawka B2B Partner</span>
              <p className="font-black text-primary text-2xl tracking-tighter">{price.toFixed(2)} PLN <span className="text-xs font-bold text-muted-foreground">Netto</span></p>
            </div>
            
            <button 
              onClick={() => handleAddToCart(id, name, price)}
              className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)] active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              Dodaj do Koszyka
            </button>
          </div>
        );
      })}
    </div>
  );
}
