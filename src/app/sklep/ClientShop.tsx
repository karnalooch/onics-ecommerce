"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; slug: string; parentId: string | null };
type Product = { id: string; name: string; price: number; description: string | null; sku: string; category: string | null; categoryId: string | null; categoryRef?: Category | null };
type CartItem = Product & { quantity: number };

export default function ClientShop({ initialProducts, categories, role }: { initialProducts: Product[], categories?: Category[], role: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const isB2B = role === "BIZ";

  // B2B Advanced Filtering
  const filtered = initialProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCatId ? p.categoryId === selectedCatId : true;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const submitQuote = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map(c => ({ id: c.id, quantity: c.quantity })) })
      });
      if (res.ok) {
        alert(isB2B ? "✅ Zapytanie wysłane! Administrator wyceni i odpowie e-mailem." : "✅ Zamówienie złożone!");
        setCart([]);
      } else {
        alert("Wystąpił błąd. Spróbuj ponownie.");
      }
    } catch {
      alert("Błąd sieciowy.");
    }
    setSubmitting(false);
  };

  const total = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "250px 1fr 300px", gap: "2rem", marginTop: "1.5rem", alignItems: "start" }}>
      
      {/* 1. Category Sidebar (Janex International style) */}
      <aside className="cat-sidebar" style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: "1.1rem", color: "var(--primary)", marginBottom: "1rem", fontWeight: 700, paddingBottom: "0.5rem", borderBottom: "2px solid var(--accent-blue)" }}>
          Kategorie
        </h3>
        
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <li>
            <button 
              onClick={() => setSelectedCatId(null)}
              style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%", padding: "0.5rem", borderRadius: "4px", backgroundColor: selectedCatId === null ? "var(--primary)" : "transparent", color: selectedCatId === null ? "#fff" : "var(--text-main)", fontWeight: selectedCatId === null ? 600 : 400, transition: "0.2s" }}
            >
              Wszystkie produkty
            </button>
          </li>
          
          {categories && categories.map(cat => (
            <li key={cat.id}>
              <button 
                onClick={() => setSelectedCatId(cat.id)}
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", width: "100%", padding: "0.5rem", borderRadius: "4px", backgroundColor: selectedCatId === cat.id ? "var(--accent-blue)" : "transparent", color: selectedCatId === cat.id ? "#fff" : "var(--text-muted)", fontWeight: selectedCatId === cat.id ? 600 : 400, transition: "0.2s" }}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* 2. Main Product Grid */}
      <div>
        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Szukaj produktów po nazwie lub indeksie..."
            style={{ width: "100%", padding: "0.85rem 1.25rem", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "0.95rem", background: "#fff", fontFamily: "inherit" }}
          />
        </div>

        <div className="products-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📭</div>
              <p>Brak produktów pasujących do kryteriów.</p>
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className="product-card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="product-card-body" style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent-blue)", fontWeight: 700, marginBottom: "0.25rem" }}>{p.sku}</div>
                <div className="product-name" style={{ fontSize: "1.1rem", color: "var(--primary)", marginBottom: "0.5rem" }}>{p.name}</div>
                {(p.categoryRef?.name || p.category) && (
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.75rem", display: "inline-block", background: "#f1f5f9", padding: "2px 8px", borderRadius: "12px" }}>
                    {p.categoryRef?.name || p.category}
                  </div>
                )}
                {p.description ? (
                  <div className="product-desc" style={{ fontSize: "0.9rem", color: "#64748b", flexGrow: 1, marginBottom: "1rem" }} dangerouslySetInnerHTML={{ __html: p.description }} />
                ) : (
                  <div className="product-desc" style={{ fontSize: "0.9rem", color: "#64748b", flexGrow: 1, marginBottom: "1rem" }}>Brak szczegółowego opisu wejściowego.</div>
                )}
                
                <div className="product-footer" style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {isB2B
                    ? <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.9rem" }}>Wycena B2B</span>
                    : <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "1.2rem" }}>{p.price.toFixed(2)} zł</span>
                  }
                  <button
                    onClick={() => addToCart(p)}
                    className="btn btn-primary"
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                  >
                    {isB2B ? "Do zapytania" : "Do koszyka"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Cart / Quote panel (Fixed position sidebar logic) */}
      <div className="cart-panel" style={{ position: "sticky", top: "110px", background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
        <div className="cart-panel-header" style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1.1rem" }}>{isB2B ? "Zapytanie ofertowe" : "Koszyk"}</div>
            {cartCount > 0 && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{cartCount} pozycji</div>}
          </div>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{isB2B ? "📋" : "🛒"}</div>
            <p style={{ fontSize: "0.9rem" }}>{isB2B ? "Wybierz produkty z lewej do wyceny" : "Twój koszyk jest pusty"}</p>
          </div>
        ) : (
          <>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem 0", maxHeight: "40vh", overflowY: "auto" }}>
              {cart.map(item => (
                <li key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", fontSize: "0.9rem", borderBottom: "1px dashed #e2e8f0", paddingBottom: "0.5rem" }}>
                  <div style={{ paddingRight: "0.5rem" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-main)", lineHeight: 1.2, marginBottom: "4px" }}>{item.name}</div>
                    <div style={{ color: "var(--accent-blue)", fontSize: "0.8rem", fontWeight: 700 }}>x{item.quantity}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: "0 4px" }}>×</button>
                </li>
              ))}
            </ul>

            {!isB2B && (
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>
                <span>Suma br.:</span>
                <span style={{ color: "var(--primary)" }}>{total.toFixed(2)} zł</span>
              </div>
            )}

            <button
              onClick={submitQuote}
              disabled={submitting}
              className="btn btn-primary full-width"
              style={{ background: isB2B ? "var(--primary)" : "var(--accent-blue)" }}
            >
              {submitting ? "Wysyłanie..." : (isB2B ? "Wyślij wycenę" : "Zamówienie")}
            </button>
          </>
        )}

        {isB2B && cart.length > 0 && (
          <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#64748b", background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            💡 Ceny B2B zostaną nadane indywidualnie po otrzymaniu zapytania. Wymagana akceptacja handlowca.
          </div>
        )}
      </div>
    </div>
  );
}
