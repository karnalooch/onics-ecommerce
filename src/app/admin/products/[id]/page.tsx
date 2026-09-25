import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { mutateMockData, readServerData } from "@/store/serverStore";

export default async function EditProductPage({ params }: { params: any }) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/logowanie");
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;
  
  const { products, categories, manufacturers } = await readServerData();
  
  let product: any = null;
  if (id !== "new") {
    product = products.find((p: any) => String(p.id) === id);
    if (!product) return <div className="p-20 text-center">Nie znaleziono produktu o ID: {id}</div>;
  }

  async function saveProduct(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string;
    const price = parseFloat(formData.get("price") as string) || 0;
    const stock = parseInt(formData.get("stock") as string) || 0;
    const categoryId = formData.get("categoryId") as string;
    const description = formData.get("description") as string;
    const manufacturerId = formData.get("manufacturerId") as string;

    await mutateMockData((db) => {
      const products = db.products as any[];

      if (id === "new") {
        products.push({
          id: `p_${crypto.randomUUID()}`,
          name,
          sku,
          price,
          stock,
          categoryId,
          description,
          manufacturerId,
          createdAt: new Date().toISOString()
        });
        return;
      }

      const index = products.findIndex((product) => String(product.id) === id);
      if (index === -1) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      products[index] = {
        ...products[index],
        name,
        sku,
        price,
        stock,
        categoryId,
        description,
        manufacturerId,
        updatedAt: new Date().toISOString()
      };
    });
    
    revalidatePath("/admin/products");
    revalidatePath("/admin/catalog");
    revalidatePath("/sklep");
    redirect("/admin/catalog?tab=products");
  }

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar - Uproszczony dla czystości */}
      <div className="admin-sidebar" style={{ width: "260px", background: "#0f172a", color: "#fff", padding: "2rem 1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/assets/logo.png" alt="CEL-TRONICS" style={{ height: "36px", filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="admin-sidebar-title" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, marginBottom: "1rem", paddingLeft: "1rem" }}>System Zarządzania</div>
        <nav className="admin-nav" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Link href="/admin/catalog" style={{ padding: "0.8rem 1rem", borderRadius: "6px", color: "#94a3b8", textDecoration: "none" }}>📊 Katalog Hybrydowy</Link>
          <Link href="/admin/catalog?tab=products" style={{ padding: "0.8rem 1rem", borderRadius: "6px", color: "#fff", background: "#1e293b", textDecoration: "none" }}>📦 Baza Produktów</Link>
          <Link href="/admin/catalog?tab=import" style={{ padding: "0.8rem 1rem", borderRadius: "6px", color: "#94a3b8", textDecoration: "none" }}>📥 Import WF-Mag</Link>
        </nav>
      </div>

      <div className="admin-content" style={{ flex: 1, padding: "2rem 3rem", background: "#f8fafc" }}>
        <div className="admin-header" style={{ marginBottom: "2rem" }}>
          <Link href="/admin/catalog?tab=products" style={{ color: "#3b82f6", fontSize: "0.85rem", fontWeight: 600, display: "inline-block", marginBottom: "0.5rem", textDecoration: "none" }}>
            ← Powrót do listy
          </Link>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1e293b" }}>{product ? `Edycja: ${product.name}` : "Nowy produkt"}</h1>
          <p style={{ color: "#64748b" }}>Zapis bezpośrednio do trwałej bazy JSON (`db.json`)</p>
        </div>

        <div className="admin-section" style={{ background: "#fff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <form action={saveProduct} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-field">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Nazwa Produktu</label>
                <input type="text" name="name" defaultValue={product?.name || ""} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div className="form-field">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Kod SKU / Indeks</label>
                <input type="text" name="sku" defaultValue={product?.sku || ""} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
              <div className="form-field">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Cena Netto (PLN)</label>
                <input type="number" step="0.01" name="price" defaultValue={product?.price || 0} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div className="form-field">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Stan Magazynowy</label>
                <input type="number" name="stock" defaultValue={product?.stock || 0} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
              </div>
              <div className="form-field">
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Producent</label>
                <select name="manufacturerId" defaultValue={product?.manufacturerId || ""} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}>
                  <option value="">-- Wybierz --</option>
                  {manufacturers.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Kategoria</label>
              <select name="categoryId" defaultValue={product?.categoryId || ""} style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}>
                <option value="">-- Wybierz --</option>
                {categories.map((c: any) => (
                  <optgroup key={c.id} label={c.name}>
                    {c.subcategories?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Opis Techniczny (HTML)</label>
              <textarea 
                name="description" 
                defaultValue={product?.description || ""} 
                rows={10} 
                style={{ width: "100%", padding: "1rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.9rem" }}
              />
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" style={{ padding: "0.75rem 2rem", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}>
                Zapisz w db.json
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
