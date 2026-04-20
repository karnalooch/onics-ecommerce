"use client";

import { useCatalogStore } from "@/store/catalogStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsDashboardClient } from "../products/ProductsDashboardClient";
import { CategoriesDashboardClient } from "../categories/CategoriesDashboardClient";
import { KnowledgeDashboardClient } from "./KnowledgeDashboardClient";
import { Database, Activity, LayoutGrid, Brain } from "lucide-react";

export function CatalogDashboard({ products, categories, manufacturers }: any) {
  const { stagingPayload } = useCatalogStore();
  const pendingCount = stagingPayload.length;

  return (
    <div className="space-y-4" suppressHydrationWarning>
      <Tabs defaultValue="crt" className="w-full">
        <header className="flex items-center justify-between bg-white border border-border p-2 rounded shadow-sm mb-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 border-r border-border pr-6">
               <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <Database className="w-4 h-4" />
               </div>
               <div className="flex flex-col">
                  <h1 className="text-xs font-black uppercase tracking-tight">Katalog Hybrydowy</h1>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Status: Terminal Active</span>
               </div>
            </div>

            <TabsList className="bg-secondary/20 p-1 h-8">
              <TabsTrigger value="crt" className="text-[10px] uppercase font-bold px-4 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <LayoutGrid className="w-3 h-3 mr-2" /> Centralny Rejestr
              </TabsTrigger>
              <TabsTrigger value="verify" className="text-[10px] uppercase font-bold px-4 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
                <Activity className="w-3 h-3 mr-2" /> Weryfikacja
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[8px] flex items-center justify-center rounded-full border border-white">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="structure" className="text-[10px] uppercase font-bold px-4 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Database className="w-3 h-3 mr-2" /> Struktura
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="text-[10px] uppercase font-bold px-4 h-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Brain className="w-3 h-3 mr-2" /> AI Intelligence
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-4 border-l border-border pl-6">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sync Node: Siedlce Cloud</span>
             </div>
          </div>
        </header>

        <div className="animate-in fade-in duration-500">
          <TabsContent value="crt" className="mt-0 outline-none">
            <ProductsDashboardClient 
              initialProducts={products} 
              categories={categories} 
              initialManufacturers={manufacturers}
              activeView="crt"
            />
          </TabsContent>

          <TabsContent value="verify" className="mt-0 outline-none">
            <ProductsDashboardClient 
              initialProducts={products} 
              categories={categories} 
              initialManufacturers={manufacturers}
              activeView="verify"
            />
          </TabsContent>

          <TabsContent value="structure" className="mt-0 outline-none">
             <CategoriesDashboardClient initialCategories={categories} />
          </TabsContent>

          <TabsContent value="intelligence" className="mt-0 outline-none">
             <KnowledgeDashboardClient />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
