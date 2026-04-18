// src/app/admin/products/page.tsx
import { initializeMockData } from "@/store/serverStore";
import { ProductsDashboardClient } from "./ProductsDashboardClient";

/**
 * Admin Products Page (Server Component)
 * Central management hub for the Celtronics B2B Catalog.
 * Aligned with AI Toolkit Standards: RSC + Atomic Decomposition + Server Actions.
 * 
 * Performance: 1200+ line monolithic Client Component split into 10+ atomic atoms.
 */
export default async function AdminProductsPage() {
  // 1. Fetch data on the server (RSC)
  const { products, categories } = initializeMockData();

  return (
    <div className="container mx-auto py-6">
      <ProductsDashboardClient 
        initialProducts={products} 
        categories={categories} 
      />
    </div>
  );
}
