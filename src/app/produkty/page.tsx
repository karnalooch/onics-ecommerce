import { Lock, Search, Filter, ShoppingCart, List, Grid3X3, Package } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { AddToCartButton } from "@/components/ui/AddToCartButton";

export const revalidate = 0; 

export default async function ConsumerCatalogPage() {
  const session = await auth();
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let products = [];
  try {
    const res = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' });
    products = await res.json();
  } catch (e) {
    console.error("Błąd pobierania produktów:", e);
  }

  // Symulacja kategorii horyzontalnych (Progessive Disclosure)
  const categories = ["Wszystkie", "CCTV", "Alarmy", "Automatyka", "Zasilanie", "Sieci IT"];

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER: DENSE & TECHNICAL */}
      <header className="technical-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Katalog Produktowy [DENSE_VIEW]
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Stan bazy: {products.length} pozycji aktywnych</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Szukaj SKU / Nazwa..." 
              className="pl-8 pr-3 py-1.5 bg-secondary/50 border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary w-64"
            />
          </div>
          <button className="p-2 border border-border rounded hover:bg-secondary text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* HORIZONTAL CATEGORY SELECTOR */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
        {categories.map((cat, i) => (
          <button 
            key={cat} 
            className={`px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-tight transition-all border
              ${i === 0 ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-secondary hover:text-foreground"}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* DENSE TABLE VIEW */}
      <div className="technical-panel overflow-hidden">
        <table className="w-full border-collapse dense-table">
          <thead className="bg-secondary/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">
            <tr>
              <th className="w-10">Zdjęcie</th>
              <th className="w-24">SKU / Kod</th>
              <th>Nazwa Produktu</th>
              <th className="hidden lg:table-cell">Producent</th>
              <th className="w-24 text-right">Cena Netto</th>
              <th className="w-24 text-center">Status</th>
              <th className="w-32 text-right">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p: any) => (
              <tr key={p.id} className="dense-row-hover">
                <td className="py-1">
                  <div className="w-8 h-8 bg-muted rounded-sm flex items-center justify-center overflow-hidden border border-border/50">
                    <img 
                      src={p.imageUrl || "/placeholder.png"} 
                      alt={p.sku} 
                      className="w-full h-full object-contain mix-blend-multiply opacity-80" 
                    />
                  </div>
                </td>
                <td className="font-bold text-primary">{p.sku}</td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground leading-tight text-xs">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-xs">{p.specs || "Brak specyfikacji"}</span>
                  </div>
                </td>
                <td className="hidden lg:table-cell">
                   <span className="text-[10px] font-bold uppercase text-muted-foreground/70">{p.manufacturer || "Inny"}</span>
                </td>
                <td className="text-right font-bold text-foreground">
                  {!p.priceHidden ? (
                    <span className="text-xs">{p.price?.toFixed(2)} PLN</span>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-muted-foreground opacity-50">
                      <Lock className="w-2.5 h-2.5" />
                      <span className="text-[9px] uppercase font-bold">Lock</span>
                    </div>
                  )}
                </td>
                <td className="text-center">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </td>
                <td className="text-right">
                  {!p.priceHidden ? (
                    <div className="flex justify-end scale-75 origin-right">
                       <AddToCartButton product={p} />
                    </div>
                  ) : (
                    <Link href="/logowanie" className="text-[9px] font-black uppercase text-primary hover:underline">
                      Auth B2B
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* COMPACT FOOTER ACTIONS */}
      <div className="flex items-center justify-between p-2 text-muted-foreground text-[10px] uppercase font-bold tracking-tight">
        <div className="flex items-center gap-4">
           <span>Wyświetlono: {products.length} / {products.length}</span>
           <span className="text-primary cursor-pointer hover:underline">Pobierz Cennik PDF</span>
        </div>
        <div className="flex items-center gap-2">
           <button className="px-2 py-1 border border-border rounded disabled:opacity-30">Poprzednia</button>
           <button className="px-2 py-1 border border-primary bg-primary text-white rounded">1</button>
           <button className="px-2 py-1 border border-border rounded disabled:opacity-30">Następna</button>
        </div>
      </div>
    </div>
  )
}
