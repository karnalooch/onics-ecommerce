// src/app/sklep/_components/ProductCard.tsx
"use client";

import { ShoppingCart, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

interface IProductCardProps {
  product: any;
  isB2B: boolean;
}

export function ProductCard({ product, isB2B }: IProductCardProps) {
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({ ...product, quantity: 1 });
    toast.success(`Dodano: ${product.name}`, {
      icon: <ShoppingCart className="w-4 h-4 text-primary" />,
      className: "rounded-2xl font-bold"
    });
  };

  return (
    <div className="group flex flex-col h-full bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
      {/* Visual Area */}
      <div className="relative h-48 bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,transparent)]" />
        <div className="relative z-10 w-full h-full border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform duration-500">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 rotate-12">Preview Model</span>
        </div>
        <div className="absolute top-4 left-4">
           {product.stock > 0 ? (
             <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none rounded-full text-[9px] font-black tracking-tight flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> DOSTĘPNY
             </Badge>
           ) : (
             <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none rounded-full text-[9px] font-black uppercase">BRAK</Badge>
           )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 flex flex-col flex-grow">
        <div className="mb-4">
           <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{product.manufacturer || 'General'}</span>
              <div className="w-1 h-1 bg-slate-200 rounded-full" />
              <span className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.sku}</span>
           </div>
           <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] mt-2">
             {product.name}
           </h3>
        </div>

        <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 flex-grow">
           {product.seoDescription || "Wysokiej klasy komponent systemów zabezpieczeń spełniający normy profesjonalnej certyfikacji."}
        </p>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{isB2B ? "Twoja Cena B2B" : "Cena Brutto"}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {product.price > 0 ? `${product.price.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł` : "Na zapytanie"}
              </span>
           </div>
           <Button 
             onClick={handleAddToCart}
             disabled={product.stock <= 0}
             className="h-12 w-12 rounded-2xl bg-slate-900 hover:bg-primary text-white shadow-xl shadow-slate-900/10 transition-all active:scale-95 group-hover:rotate-[360deg] duration-700"
             size="icon"
           >
             <ShoppingCart className="w-5 h-5" />
           </Button>
        </div>
      </div>
    </div>
  );
}
