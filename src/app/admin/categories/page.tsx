// src/app/admin/categories/page.tsx
import { initializeMockData } from "@/store/serverStore";
import { CategoriesDashboardClient } from "./CategoriesDashboardClient";

/**
 * Admin Categories Page (Server Component)
 * Manages the product category hierarchy and visual identification.
 * Aligned with AI Toolkit Standards (Next.js 16 Server-First Architecture).
 */
export default async function AdminCategoriesPage() {
  // 1. Fetch data on the server (RSC)
  const { categories } = initializeMockData();

  return (
    <div className="container mx-auto py-6">
      <CategoriesDashboardClient initialCategories={categories} />
    </div>
  );
}
