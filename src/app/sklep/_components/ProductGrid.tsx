// src/app/sklep/_components/ProductGrid.tsx
"use client";

import { PackageSearch } from "lucide-react";
import { ProductCard } from "./ProductCard";

interface IProductGridProps {
  products: any[];
  isB2B: boolean;
}

export function ProductGrid({ products, isB2B }: IProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
        <div className="p-10 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 mb-8">
           <PackageSearch className="w-20 h-20 text-slate-200" />
        </div>
        <h4 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Brak produktów</h4>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Zmień filtry lub słowo kluczowe w wyszukiwarce.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {products.map(p => (
        <ProductCard key={p.id} product={p} isB2B={isB2B} />
      ))}
    </div>
  );
}
