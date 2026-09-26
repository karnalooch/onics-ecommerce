import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { initializeMockData, mutateMockData } from "@/store/serverStore";
import {
  assertCatalogClassification,
  hasSkuConflict,
} from "@/lib/catalog";
import {
  shouldDeferProductStockWrite,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations";

const ProductFormSchema = z.object({
  name: z.string().trim().min(2).max(240),
  sku: z.string().trim().min(1).max(120),
  price: z.coerce.number().finite().min(0).max(100_000_000),
  stock: z.coerce.number().int().min(0).max(100_000_000),
  manufacturer: z.string().trim().max(160).optional().default(""),
  categoryId: z.string().trim().max(160).nullable().optional(),
  subcategoryId: z.string().trim().max(160).nullable().optional(),
  description: z.string().max(10_000).optional().default(""),
});

export default async function EditProductPage({ params }: { params: any }) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/logowanie");
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { products, categories, manufacturers } = initializeMockData();

  let product: any = null;
  if (id !== "new") {
    product = products.find((candidate: any) => String(candidate.id) === id);
    if (!product) {
      return (
        <div className="p-20 text-center">
          Nie znaleziono produktu o ID: {id}
        </div>
      );
    }
  }

  async function saveProduct(formData: FormData) {
    "use server";

    const actionSession = await auth();
    if (
      !actionSession?.user ||
      (actionSession.user as any).role !== "ADMIN"
    ) {
      throw new Error("Brak uprawnień administratora.");
    }

    const parsed = ProductFormSchema.safeParse({
      name: formData.get("name"),
      sku: formData.get("sku"),
      price: formData.get("price"),
      stock: formData.get("stock"),
      manufacturer: formData.get("manufacturer"),
      categoryId: String(formData.get("categoryId") || "").trim() || null,
      subcategoryId: String(formData.get("subcategoryId") || "").trim() || null,
      description: formData.get("description"),
    });

    if (!parsed.success) {
      throw new Error(
        parsed.error.issues[0]?.message || "Nieprawidłowe dane produktu."
      );
    }

    await mutateMockData((db) => {
      const productStore = db.products as any[];
      const categoryStore = db.categories as any[];
      const input = parsed.data;

      assertCatalogClassification(
        categoryStore,
        input.categoryId,
        input.subcategoryId
      );

      if (id === "new") {
        if (hasSkuConflict(productStore, input.sku)) {
          throw new Error("SKU_EXISTS");
        }

        productStore.push({
          id: `p_${crypto.randomUUID()}`,
          ...input,
          seoDescription: input.description,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      const index = productStore.findIndex(
        (candidate) => String(candidate.id) === id
      );
      if (index === -1) throw new Error("PRODUCT_NOT_FOUND");
      if (hasSkuConflict(productStore, input.sku, id)) {
        throw new Error("SKU_EXISTS");
      }
      if (
        shouldDeferProductStockWrite(
          db.orders as InventoryReservationOrder[],
          id,
          productStore[index].stock,
          input.stock
        )
      ) {
        throw new Error("PRODUCT_STOCK_RESERVED");
      }

      productStore[index] = {
        ...productStore[index],
        ...input,
        seoDescription:
          input.description || productStore[index].seoDescription || "",
        updatedAt: new Date().toISOString(),
      };
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    revalidatePath("/sklep");
    redirect("/admin/products");
  }

  const selectedCategoryId = product?.categoryId || "";
  const selectedSubcategoryId = product?.subcategoryId || "";

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <div className="admin-sidebar" style={{ width: "260px", background: "#0f172a", color: "#fff", padding: "2rem 1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/assets/logo.png" alt="CEL-TRONICS" style={{ height: "36px", filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="admin-sidebar-title" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, marginBottom: "1rem", paddingLeft: "1rem" }}>System Zarządzania</div>
        <nav className="admin-nav" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link href="/admin/products" style={{ padding: "0.8rem 1rem", borderRadius: "6px", color: "#fff", background: "#1e293b", textDecoration: "none" }}>📦 Baza Produktów</Link>
          <Link href="/admin/catalog?tab=import" style={{ padding: "0.8rem 1rem", borderRadius: "6px", color: "#94a3b8", textDecoration: "none" }}>📥 Import WF-Mag</Link>
        </nav>
      </div>

      <div className="admin-content" style={{ flex: 1, padding: "2rem 3rem", background: "#f8fafc" }}>
        <div className="admin-header" style={{ marginBottom: "2rem" }}>
          <Link href="/admin/products" style={{ color: "#3b82f6", fontSize: "0.85rem", fontWeight: 600, display: "inline-block", marginBottom: "0.5rem", textDecoration: "none" }}>
            ← Powrót do listy
          </Link>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1e293b" }}>{product ? `Edycja: ${product.name}` : "Nowy produkt"}</h1>
          <p style={{ color: "#64748b" }}>Zmiany są walidowane po stronie serwera i respektują lifecycle magazynowy.</p>
        </div>

        <div className="admin-section" style={{ background: "#fff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <form action={saveProduct} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Nazwa Produktu</label>
                <input type="text" name="name" defaultValue={product?.name || ""} required minLength={2} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Kod SKU / Indeks</label>
                <input type="text" name="sku" defaultValue={product?.sku || ""} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Cena Netto (PLN)</label>
                <input type="number" step="0.01" min="0" name="price" defaultValue={product?.price ?? 0} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Stan Magazynowy</label>
                <input type="number" min="0" name="stock" defaultValue={product?.stock ?? 0} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Producent</label>
                <select name="manufacturer" defaultValue={product?.manufacturer || ""} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}>
                  <option value="">-- Wybierz --</option>
                  {manufacturers.map((manufacturer: any) => (
                    <option key={manufacturer.id} value={manufacturer.name}>{manufacturer.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Kategoria</label>
                <select name="categoryId" defaultValue={selectedCategoryId} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}>
                  <option value="">-- Brak --</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Podkategoria</label>
                <select name="subcategoryId" defaultValue={selectedSubcategoryId} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}>
                  <option value="">-- Brak --</option>
                  {categories.flatMap((category: any) =>
                    (category.subcategories || []).map((subcategory: any) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {category.name} — {subcategory.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Opis Techniczny</label>
              <textarea
                name="description"
                defaultValue={product?.description || product?.seoDescription || ""}
                rows={10}
                style={{ width: "100%", padding: "1rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.9rem" }}
              />
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ padding: "0.75rem 2rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                Zapisz produkt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
