// src/app/admin/knowledge/page.tsx
import { redirect } from "next/navigation";
export default function LegacyKnowledgePage() {
  redirect("/admin/catalog?tab=knowledge");
}
