"use client";

import { useCatalogStore } from "@/store/catalogStore";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProductsDashboardClient } from "../products/ProductsDashboardClient";
import { CategoriesDashboardClient } from "../categories/CategoriesDashboardClient";
import { KnowledgeDashboardClient } from "./KnowledgeDashboardClient";

export function CatalogDashboard({ products, categories, manufacturers }: any) {
  const { stagingPayload } = useCatalogStore();
  const pendingCount = stagingPayload.length;

  return (
    <div className="space-y-16" suppressHydrationWarning>
      <Tabs defaultValue="crt" className="w-full">
        <header className="flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-2">
              <div className="h-[2px] w-12 bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary italic">Universal Synchronization Engine</span>
            </div>
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase italic leading-[0.85] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Sync <span className="text-primary block lg:inline relative">
                Hub
                <div className="absolute -bottom-2 left-0 w-full h-4 bg-primary/10 -skew-x-12 -z-10" />
              </span>
            </h1>
            <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400 max-w-2xl leading-loose">
              Modularna architektura danych, inteligentne mapowanie IQ oraz <span className="text-slate-900 dark:text-white underline decoration-primary decoration-2 underline-offset-4">Zunifikowany Rejestr Towarowy</span>. [System Ready V12.0]
            </p>
          </div>

          <div className="flex items-center gap-6 animate-in fade-in slide-in-from-right-4 duration-1000">
            <div className="p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] border border-white dark:border-slate-800 shadow-2xl flex items-center gap-6 group hover:scale-105 transition-all duration-500">
               <div className="relative">
                 <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                 <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)] relative z-10" />
               </div>
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Status: Operational</span>
                  <span className="text-xl font-black italic tracking-tighter">Hub Autostrada Aktywna</span>
               </div>
            </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
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
