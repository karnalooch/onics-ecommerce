import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminActions from "./AdminActions";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    // Tymczasowo nie przekierowujemy tak aby można było testować dev:
    // redirect("/");
  }

  const [unapprovedUsers, quotes, totalProducts, totalUsers] = await Promise.all([
    prisma.user.findMany({ where: { isApproved: false, role: "BIZ" } }),
    prisma.quote.findMany({
      include: { user: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.product.count(),
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
  ]);

  const pendingQuotes = quotes.filter(q => q.status === "PENDING");

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/assets/logo.png" alt="CEL-TRONICS" style={{ height: "36px", filter: "brightness(0) invert(1)" }} />
        </div>
        <div className="admin-sidebar-title">Panel Admina</div>
        <nav className="admin-nav">
          <Link href="/admin" className="active">📊 Dashboard</Link>
          <Link href="/admin/products" style={{ fontWeight: 600, color: "var(--accent-blue)" }}>📦 Baza Produktów</Link>
          <Link href="/admin/import">📥 Import WF-Mag</Link>
          <Link href="/sklep">🛒 Sklep (podgląd)</Link>
          <Link href="/">🌐 Strona główna</Link>
        </nav>
      </div>

      {/* Content */}
      <div className="admin-content">
        <div className="admin-header">
          <h1>Dashboard</h1>
          <p>Zarządzaj klientami, ofertami i cennikami.</p>
        </div>

        {/* Stats */}
        <div className="admin-cards">
          <div className="admin-stat-card orange">
            <div className="admin-stat-num">{unapprovedUsers.length}</div>
            <div className="admin-stat-label">⏳ Oczekujących B2B</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-num">{pendingQuotes.length}</div>
            <div className="admin-stat-label">📋 Nowych zapytań</div>
          </div>
          <div className="admin-stat-card green">
            <div className="admin-stat-num">{totalProducts}</div>
            <div className="admin-stat-label">📦 Produktów w bazie</div>
          </div>
        </div>

        {/* Awaiting B2B approval */}
        <div className="admin-section">
          <div className="admin-section-title">
            ⏳ Oczekujący Instalatorzy B2B
            {unapprovedUsers.length > 0 && <span className="badge-count">{unapprovedUsers.length}</span>}
          </div>

          {unapprovedUsers.length === 0 ? (
            <div className="alert-box success">✅ Brak kont oczekujących na zatwierdzenie.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>NIP</th>
                  <th>E-mail</th>
                  <th>Data rejestracji</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {unapprovedUsers.map(user => (
                  <tr key={user.id}>
                    <td><strong>{user.companyName || "—"}</strong></td>
                    <td><code>{user.nip || "—"}</code></td>
                    <td>{user.email}</td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(user.createdAt).toLocaleDateString("pl-PL")}
                    </td>
                    <td>
                      <AdminActions actionType="approveUser" userId={user.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quotes */}
        <div className="admin-section">
          <div className="admin-section-title">
            📋 Zapytania Ofertowe
            {pendingQuotes.length > 0 && <span className="badge-count">{pendingQuotes.length} nowych</span>}
          </div>

          {quotes.length === 0 ? (
            <div className="alert-box info">ℹ️ Brak zgłoszeń ofertowych.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID Oferty</th>
                  <th>Klient</th>
                  <th>Produkty</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Akcja</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td><strong style={{ fontFamily: "monospace" }}>#{q.id.slice(-6)}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.user.companyName || q.user.email}</div>
                      {q.user.nip && <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>NIP: {q.user.nip}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: "0.85rem" }}>
                        {q.items.map(i => `${i.product.name} ×${i.quantity}`).join(", ")}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${q.status.toLowerCase()}`}>
                        {q.status === "PENDING" ? "Oczekuje" : q.status === "QUOTED" ? "Wycenione" : q.status === "ACCEPTED" ? "Przyjęte" : "Odrzucone"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(q.createdAt).toLocaleDateString("pl-PL", { day:"2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <AdminActions actionType="processQuote" quoteId={q.id} currentStatus={q.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tools */}
        <div className="admin-section">
          <div className="admin-section-title">🛠️ Narzędzia</div>
          <Link href="/admin/import" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            📥 Import Cennika WF-Mag (CSV/XLS)
          </Link>
        </div>
      </div>
    </div>
  );
}
