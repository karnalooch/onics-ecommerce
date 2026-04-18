// src/app/admin/categories/page.tsx
import { redirect } from "next/navigation";
export default function LegacyCategoriesPage() {
  redirect("/admin/catalog?tab=categories");
}
