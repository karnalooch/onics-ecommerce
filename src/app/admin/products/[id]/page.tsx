import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // redirect("/");
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;
  let product = null;
  
  if (id !== "new") {
    product = await prisma.product.findUnique({ where: { id } });
    if (!product) return <div>Nie znaleziono produktu</div>;
  }

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  async function saveProduct(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string;
    const price = parseFloat(formData.get("price") as string) || 0;
    const stock = parseInt(formData.get("stock") as string) || 0;
    const categoryId = formData.get("categoryId") as string;
    const description = formData.get("description") as string;

    if (id === "new") {
      await prisma.product.create({
        data: { name, sku, price, stock, categoryId: categoryId || null, description: description || null }
      });
    } else {
      await prisma.product.update({
        where: { id },
        data: { name, sku, price, stock, categoryId: categoryId || null, description: description || null }
      });
    }
    
    revalidatePath("/admin/products");
    revalidatePath("/sklep");
    redirect("/admin/products");
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/assets/logo.png" alt="CEL-TRONICS" style={{ height: "36px", filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="admin-sidebar-title">Panel Admina</div>
        <nav className="admin-nav">
          <Link href="/admin">📊 Dashboard</Link>
          <Link href="/admin/products" className="active">📦 Baza Produktów</Link>
          <Link href="/admin/import">📥 Import WF-Mag</Link>
          <Link href="/sklep">🛒 Sklep (podgląd)</Link>
        </nav>
      </div>

      <div className="admin-content">
        <div className="admin-header" style={{ marginBottom: "2rem" }}>
          <Link href="/admin/products" style={{ color: "var(--accent-blue)", fontSize: "0.9rem", fontWeight: 600, display: "inline-block", marginBottom: "0.5rem" }}>
            ← Wróć do listy
          </Link>
          <h1>{product ? `Edytuj produkt: ${product.name}` : "Nowy produkt"}</h1>
          <p>Modyfikuj dane pamiętając, że import z WF-Mag nadpisze cenę oraz stany magazynowe dla danego SKU.</p>
        </div>

        <div className="admin-section">
          <form action={saveProduct} style={{ maxWidth: "800px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-field">
                <label>Nazwa Produktu</label>
                <input type="text" name="name" defaultValue={product?.name || ""} required />
              </div>
              <div className="form-field">
                <label>Indeks / Kod SKU (Główny klucz powiązania ze starym systemem)</label>
                <input type="text" name="sku" defaultValue={product?.sku || ""} required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
              <div className="form-field">
                <label>Cena bazowa netto</label>
                <input type="number" step="0.01" name="price" defaultValue={product?.price || 0} required />
              </div>
              <div className="form-field">
                <label>Stan obecny</label>
                <input type="number" name="stock" defaultValue={product?.stock || 0} required />
              </div>
              <div className="form-field">
                <label>Kategoria w drzewie struktury</label>
                <select name="categoryId" defaultValue={product?.categoryId || ""} style={{ width: "100%", padding: "0.8rem", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", fontFamily: "inherit" }}>
                  <option value="">-- Wybierz --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Bogaty Opis Techniczny (Wspiera znaczniki HTML)</label>
              <textarea 
                name="description" 
                defaultValue={product?.description || ""} 
                rows={12} 
                placeholder="<h1>Opis kamery</h1><p>Wysoka rozdzielczość...</p>"
                style={{ width: "100%", padding: "1rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.95rem" }}
              />
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>To pole nie zostanie zatarte przez import z WF-Maga.</p>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ padding: "12px 30px" }}>💾 Zapisz produkt w bazie</button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
