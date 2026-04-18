// src/app/sklep/loading.tsx
import { ShoppingCart } from "lucide-react";

export default function ShopLoading() {
  return (
    <div className="container mx-auto py-20 px-6">
      <div className="flex flex-col items-center justify-center gap-8 animate-pulse">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-primary/20 rounded-full border-t-primary animate-spin"></div>
          <ShoppingCart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary/40" />
        </div>
        <div className="text-center">
          <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-800 italic">Otwieranie <span className="text-primary underline decoration-primary/20 underline-offset-8">Katalogu</span></h3>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-4">Pobieranie najnowszych stanów i cen...</p>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full mt-12">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] h-[400px]"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
