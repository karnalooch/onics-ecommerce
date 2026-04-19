import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { initializeMockData } from "@/store/serverStore";
import { CatalogDashboard } from "./CatalogDashboard";
import { getKnowledge } from "@/lib/knowledge/parser";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Unified Catalog Command Center (Server Component)
 * Hybrid Data Fusion [Inventory + IQ Knowledge]
 */
export default async function CatalogPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') redirect("/logowanie");

  // 1. Fetch Physical Inventory
  const { products, categories, manufacturers } = initializeMockData();
  
  // 2. Fetch Virtual Knowledge Base
  let virtualDevices: any[] = [];
  try {
    const store = await getKnowledge();
    const knowledgeKeys = Object.keys(store.knowledge);
    
    // Create a set of existing SKUs for fast lookup
    const existingSkus = new Set(products.map((p: any) => String(p.sku || '').trim().toLowerCase()));

    // Transform Knowledge Entries into Virtual Products
    virtualDevices = knowledgeKeys
      .filter(key => !existingSkus.has(key.trim().toLowerCase()))
      .map(key => {
        const entry = store.knowledge[key];
        return {
          id: `virtual_${key}`,
          sku: key,
          name: entry.model || key,
          manufacturer: entry.manufacturer || "",
          price: 0,
          catalogPrice: entry.price || 0,
          stock: 0,
          isVirtual: true,
          seoDescription: entry.specs || "",
          catalogSpecs: entry.specs || ""
        };
      });
  } catch (e) {
    console.error("Fusion Error: Failed to load knowledge base", e);
  }

  // 3. Combine into the Unified Hybrid Feed
  const unifiedDevices = [...products, ...virtualDevices];

  return (
    <div className="min-h-screen bg-slate-50/20">
       <CatalogDashboard 
         products={unifiedDevices} 
         categories={categories} 
         manufacturers={manufacturers}
       />
    </div>
  );
}
