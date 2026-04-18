import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { Lock } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";

export const revalidate = 60; 

export default async function ConsumerCatalogPage() {
  const session = await auth();
  
  // Pobieramy dane z naszego API, które obsługuje RBAC (ukrywanie cen)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let products = [];
  try {
    const res = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' });
    products = await res.json();
  } catch (e) {
    console.error("Błąd pobierania produktów:", e);
  }

  return (
    <div className="container mx-auto py-12 px-6 max-w-7xl animate-in fade-in duration-700">
      <div className="flex flex-col gap-1 mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Katalog <span className="text-accent underline decoration-4 underline-offset-4">Produktowy</span></h1>
        <p className="text-muted-foreground font-medium">Przeglądaj pełną ofertę systemów bezpieczeństwa Celtronics.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((p: any) => {
          // Mapowanie kategorii na nowo wygenerowane grafiki premium
          let imageUrl = "/placeholder.png"; 
          if (p.categoryId === "c3") imageUrl = "/security_monitoring_hero_1776461316604.png";
          if (p.categoryId === "c7") imageUrl = "/alarm_system_premium_1776461332910.png";
          if (p.categoryId === "c4" || p.categoryId === "c2") imageUrl = "/networking_pro_hardware_1776461349508.png";
          if (p.categoryId === "c1") imageUrl = "/sat_tv_antenna_pro_1776461365418.png";

          return (
            <div key={p.id} className="group relative flex flex-col bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden backdrop-blur-sm">
              <div className="aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform duration-700 relative overflow-hidden">
                <img src={imageUrl} alt={p.name} className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-60" />
                <span className="absolute top-4 left-4 text-[9px] font-black text-white/80 uppercase tracking-widest bg-black/20 backdrop-blur-md px-2 py-1 rounded-lg">
                  {p.manufacturer || "Celtronics"}
                </span>
              </div>
              
              <div className="p-6 flex flex-col flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-400/10 px-2 py-0.5 rounded-full">
                    {p.sku}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-snug mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
                  {p.name}
                </h3>
                
                <div className="mt-auto pt-4 border-t border-slate-50 dark:border-white/5">
                  {!p.priceHidden ? (
                    <div className="flex flex-col">
                      <div className="flex items-end justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Twoja Cena Netto</span>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{p.price?.toFixed(2)} PLN</span>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                          Dostępny
                        </div>
                      </div>
                      <AddToCartButton product={p} />
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-white/10 group/lock transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Lock className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Cena Chroniona</span>
                      </div>
                      <Link href="/logowanie">
                        <button className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] hover:tracking-[0.25em] transition-all">
                          Zaloguj się dla cen B2B
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
