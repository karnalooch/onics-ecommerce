import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProductsDashboardClient } from "./ProductsDashboardClient";
import { initializeMockData } from "@/store/serverStore";

export default async function ProductsAdminPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') redirect("/logowanie");

  const { products, categories, manufacturers } = initializeMockData();

  return (
    <div className="flex flex-col gap-8" suppressHydrationWarning>
      <ProductsDashboardClient 
        initialProducts={products} 
        categories={categories}
        initialManufacturers={manufacturers}
      />
    </div>
  );
}
