import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminProductsPage() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // redirect("/");
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { categoryRef: true }
  });

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
          <Link href="/">🌐 Strona główna</Link>
        </nav>
      </div>

      {/* Content */}
      <div className="admin-content">
        <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Zarządzanie Produktami (CMS)</h1>
            <p>Ręcznie dodawaj lub edytuj pełne opisy techniczne, które nie znikną przy imporcie cennika z WF-Maga.</p>
          </div>
          <Link href="/admin/products/new" className="btn btn-primary" style={{ padding: "10px 20px" }}>
            + Nowy Produkt
          </Link>
        </div>

        <div className="admin-section" style={{ marginTop: "2rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Indeks/SKU</th>
                <th>Nazwa Artykułu</th>
                <th>Kategoria</th>
                <th>Cena Netto</th>
                <th>Stan</th>
                <th>Zaawansowany Opis / HTML</th>
                <th>Opcje</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><strong style={{ color: "var(--accent-blue)" }}>{p.sku}</strong></td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.categoryRef?.name || p.category || "—"}</td>
                  <td>{p.price.toFixed(2)} zł</td>
                  <td>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "12px", 
                      fontSize: "0.8rem", 
                      background: p.stock > 0 ? "#dcfce7" : "#fee2e2",
                      color: p.stock > 0 ? "#166534" : "#991b1b",
                      fontWeight: 700 
                    }}>
                      {p.stock} szt.
                    </span>
                  </td>
                  <td>
                    {p.description ? (
                      <span style={{ color: "#16a34a", fontSize: "0.8rem", fontWeight: 700 }}>Tak, skonfigurowano</span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Brak (dane tylko z WF-Mag)</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="btn-secondary" style={{ padding: "4px 10px", fontSize: "0.8rem", color: "var(--primary)", borderColor: "var(--primary)" }}>
                      Edytuj w CMS
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Baza produktów jest pusta. Zaimportuj plik z WF-Mag lub dodaj ręcznie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
