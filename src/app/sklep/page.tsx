import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClientShop from "./ClientShop";

export default async function SklepPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/logowanie");
  }

  const { role, isApproved } = session.user as any;

  if (role === "BIZ" && !isApproved) {
    return (
      <div className="pending-screen">
        <div className="pending-icon">⏳</div>
        <h2>Konto oczekuje na weryfikację</h2>
        <p>
          Twój NIP i dane firmowe zostały przesłane do weryfikacji. Gdy Administrator zatwierdzi konto, 
          otrzymasz e-mail i dostęp do dedykowanych cen B2B oraz systemu zapytań ofertowych.
        </p>
        <div style={{ marginTop: "2rem" }}>
          <a href="/" className="btn btn-primary">Wróć na stronę główną</a>
        </div>
      </div>
    );
  }

  const products: any[] = [];

  const categories: any[] = [];

  const roleLabel = role === "BIZ" ? "Instalator B2B" : role === "ADMIN" ? "Administrator" : "Klient Detaliczny";
  const roleBadgeClass = role === "BIZ" ? "biz" : role === "ADMIN" ? "admin" : "retail";

  return (
    <div className="container" style={{ maxWidth: 'var(--container-w)' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "2.5rem", marginBottom: "0.5rem" }}>
        <div>
          <h1 className="page-heading">Katalog Produktów</h1>
          <p className="page-sub">{products.length} produktów w bazie danych</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className={`role-badge ${roleBadgeClass}`}>
            {role === "BIZ" ? "🏢" : role === "ADMIN" ? "⚙️" : "🛒"} {roleLabel}
          </span>
          {role === "ADMIN" && (
            <a href="/admin" className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              Panel Admina →
            </a>
          )}
        </div>
      </div>

      <ClientShop initialProducts={products} categories={categories} role={role} />
    </div>
  );
}
