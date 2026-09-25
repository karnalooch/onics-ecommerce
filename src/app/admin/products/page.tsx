import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ProductsDashboardClient } from "./ProductsDashboardClient";
import { readServerData } from "@/store/serverStore";
import type { ICategory, IManufacturer, IProduct } from "./_lib/types";

export default async function ProductsAdminPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== 'ADMIN') redirect("/logowanie");

  const { products, categories, manufacturers } = await readServerData();
  const initialProducts = products as unknown as IProduct[];
  const initialCategories = categories as unknown as ICategory[];
  const initialManufacturers = manufacturers as unknown as IManufacturer[];

  return (
    <div className="flex flex-col gap-8" suppressHydrationWarning>
      <ProductsDashboardClient 
        initialProducts={initialProducts} 
        categories={initialCategories}
        initialManufacturers={initialManufacturers}
      />
    </div>
  );
}
