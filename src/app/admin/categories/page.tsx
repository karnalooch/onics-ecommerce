import { readServerData } from "@/store/serverStore";
import { CategoriesDashboardClient } from "./CategoriesDashboardClient";

export default async function CategoriesPage() {
  const { categories } = await readServerData();
  return <CategoriesDashboardClient initialCategories={categories} />;
}
