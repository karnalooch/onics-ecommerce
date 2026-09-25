// src/app/admin/repairs/page.tsx
import { initializeMockData } from "@/store/serverStore";
import { RepairsDashboardClient } from "./RepairsDashboardClient";

/**
 * Admin RMA Page (Server Component)
 * Fetches data on the server and delegates interactivity to the Client Component.
 * Aligned with AI Toolkit Standards (Next.js 16 Server-First Architecture).
 */
export default async function AdminRmaPage() {
  // 1. Fetch data directly on the server (RSC)
  const { repairs } = initializeMockData();
  
  // 2. Ensure data structure compatibility
  // Note: Local storage in node global might have different field names from manual UI entries
  const formattedRepairs = repairs.map((r: any) => ({
    id: r.id,
    client: r.client || r.clientEmail || "Nieznany Klient",
    item: r.item || r.device || "Nieznane Urządzenie",
    serial: r.serial || "N/A",
    date: r.date || (r.createdAt ? r.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    status: r.status || "WERYFIKACJA",
    description: r.description || ""
  }));

  return (
    <div className="container mx-auto py-10 px-4">
      <RepairsDashboardClient initialData={formattedRepairs} />
    </div>
  );
}
