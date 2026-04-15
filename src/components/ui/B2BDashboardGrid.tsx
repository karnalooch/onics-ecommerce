"use client";

import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner"; // opcjonalnie
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
    // Zamiast alertu, możemy wysłać powiadomienie, ale dla pewności po prostu od razu wrzucimy usera do koszyka lub do powiadomienia
    router.push("/koszyk");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => {
        const price = 400 + i * 50;
        const name = `Płyta Główna Asus Z${i}0 (Multi-Pack)`;
        const id = String(i);

        return (
          <div key={id} className="border p-6 rounded-2xl bg-card shadow-sm hover:shadow-lg transition-all animate-in fade-in zoom-in duration-500">
            <div className="bg-muted w-full h-32 rounded-lg mb-4 flex items-center justify-center text-muted-foreground text-sm font-mono">
              [HURT_IMG_{i}]
            </div>
            <h3 className="font-bold text-lg mb-2 leading-tight">{name}</h3>
            <p className="text-secondary-foreground mb-4">Stawka B2B: <span className="font-extrabold text-green-600 text-xl">{price.toFixed(2)} PLN Netto</span></p>
            
            <button 
              onClick={() => handleAddToCart(id, name, price)}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3 rounded-xl font-semibold hover:bg-foreground/90 transition shadow-sm active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              Dodaj do Koszyka B2B
            </button>
          </div>
        );
      })}
    </div>
  );
}
