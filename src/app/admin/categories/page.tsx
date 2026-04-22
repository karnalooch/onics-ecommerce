import { initializeMockData } from "@/store/serverStore";
import { CategoriesDashboardClient } from "./CategoriesDashboardClient";

export default function CategoriesPage() {
  const { categories } = initializeMockData();
  return <CategoriesDashboardClient initialCategories={categories} />;
}
