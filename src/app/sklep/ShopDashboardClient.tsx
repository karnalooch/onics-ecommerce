// src/app/sklep/ShopDashboardClient.tsx
"use client";

import { useState, useMemo } from "react";
import { ShopSidebar } from "./_components/ShopSidebar";
import { ProductGrid } from "./_components/ProductGrid";
import { MiniCart } from "./_components/MiniCart";

interface IShopDashboardClientProps {
  initialProducts: any[];
  categories: any[];
  role: string;
}

export function ShopDashboardClient({ initialProducts, categories, role }: IShopDashboardClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const isB2B = role === "BIZ" || role === "ADMIN";

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p: any) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCatId || p.categoryId === selectedCatId;
      return matchSearch && matchCat;
    });
  }, [initialProducts, search, selectedCatId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12 items-start animate-in fade-in duration-1000">
       {/* Left: Advanced Filtering */}
       <div className="lg:col-span-3">
          <ShopSidebar 
             categories={categories}
             selectedCatId={selectedCatId}
             onSelect={setSelectedCatId}
             search={search}
             onSearchChange={setSearch}
          />
       </div>

       {/* Middle: Catalog Grid */}
       <div className="lg:col-span-6 min-h-[800px]">
          <ProductGrid 
             products={filteredProducts}
             isB2B={isB2B}
          />
       </div>

       {/* Right: Smart Terminal (Cart) */}
       <div className="lg:col-span-3">
          <MiniCart isB2B={isB2B} />
       </div>
    </div>
  );
}
