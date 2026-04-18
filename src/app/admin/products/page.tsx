// src/app/admin/products/page.tsx
import { redirect } from "next/navigation";
export default function LegacyProductsPage() {
  redirect("/admin/catalog?tab=products");
}
