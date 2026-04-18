// src/app/admin/catalog/CatalogDashboard.tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageSearch, FolderTree, Brain, Activity } from "lucide-react";
import { ProductsDashboardClient } from "../products/ProductsDashboardClient";
import { CategoriesDashboardClient } from "../categories/CategoriesDashboardClient";
import { KnowledgeDashboardClient } from "./KnowledgeDashboardClient";

export function CatalogDashboard({ products, categories }: any) {
  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      <header className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900">
          Centrum Zarządzania <span className="text-primary italic">Katalogiem</span>
        </h1>
        <p className="text-slate-500 font-medium">Zunifikowany węzeł synchronizacji produktów, cenników i struktury kategorii.</p>
      </header>

      <Tabs defaultValue="products" className="space-y-12">
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-[2rem] border-2 border-slate-100 shadow-xl shadow-slate-200/50 sticky top-24 z-20">
          <TabsList className="bg-transparent border-none gap-2">
            <TabsTrigger value="products" className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <PackageSearch className="w-4 h-4" /> Magazyn & Import
            </TabsTrigger>
            <TabsTrigger value="categories" className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <FolderTree className="w-4 h-4" /> Struktura Działów
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
              <Brain className="w-4 h-4" /> Baza Wiedzy AI
            </TabsTrigger>
          </TabsList>
          
          <div className="px-6 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Sync Hub Active</span>
          </div>
        </div>

        <TabsContent value="products" className="outline-none">
          <ProductsDashboardClient initialProducts={products} categories={categories} />
        </TabsContent>
        
        <TabsContent value="categories" className="outline-none">
          <CategoriesDashboardClient initialCategories={categories} />
        </TabsContent>

        <TabsContent value="knowledge" className="outline-none">
          <KnowledgeDashboardClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}
