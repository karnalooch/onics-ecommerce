// src/app/admin/catalog/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { initializeMockData } from "@/store/serverStore";
import { CatalogDashboard } from "./CatalogDashboard";

/**
 * Unified Catalog Command Center (Server Component)
 * Orchestrates Products, Categories, and Knowledge Hub into a single tabbed terminal.
 */
export default async function CatalogPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') redirect("/logowanie");

  const { products, categories } = initializeMockData();
  // Slice to first 100 items to avoid "Body exceeded 1 MB limit" during serialization
  const initialProductsSlice = products.slice(0, 100);

  return (
    <div className="min-h-screen bg-slate-50/20">
       <CatalogDashboard 
         products={initialProductsSlice} 
         categories={categories} 
       />
    </div>
  );
}
