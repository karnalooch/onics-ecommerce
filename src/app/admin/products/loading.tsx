// src/app/admin/products/loading.tsx
import { ShoppingBag } from "lucide-react";

export default function ProductsLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-primary/20 rounded-full border-t-primary animate-spin"></div>
        <ShoppingBag className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary/40" />
      </div>
      <div className="text-center px-4">
        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 italic">Analiza bazy <span className="text-primary underline decoration-primary/20 underline-offset-8">Magazynowej</span></h3>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-3 max-w-sm mx-auto">Przeszukiwanie tysięcy produktów i weryfikacja stanów magazynowych...</p>
      </div>
    </div>
  );
}
