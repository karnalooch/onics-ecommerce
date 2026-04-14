"use client";

import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";
import { Trash2, ShieldCheck, BadgeEuro, CreditCard, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { data: session } = useSession();
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const router = useRouter();

  // Ochrona przed Hydration Mismatch w Next.js + Zustand (Local Storage)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          role: (session?.user as any)?.role || "RETAIL",
          nip: (session?.user as any)?.nip || null,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url; // Przeniesienie do Stripe
      } else {
        alert(data.error || "Wystąpił błąd przy tworzeniu transakcji.");
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error(error);
      alert("Błąd połączenia z bramką.");
      setIsCheckingOut(false);
    }
  };

  if (!mounted) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="container mx-auto py-12 px-4 min-h-[calc(100vh-200px)]">
      <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
        <BadgeEuro className="w-8 h-8 text-primary" />
        Twój Koszyk
      </h1>
      
      {items.length === 0 ? (
        <div className="bg-muted/30 border border-dashed rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-lg">Twój koszyk jest pusty.</p>
          <button onClick={() => router.push('/produkty')} className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 font-medium transition-colors">Przejdź do sklepu</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between border bg-card p-4 rounded-xl shadow-sm">
                <div className="flex-1">
                  <p className="font-bold text-lg">{item.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  <p className="text-primary font-semibold mt-1">{item.price.toFixed(2)} PLN</p>
                </div>
                
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <button 
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1 bg-muted hover:bg-muted/80"
                    >-</button>
                    <span className="px-4 font-medium min-w-[3rem] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 bg-muted hover:bg-muted/80"
                    >+</button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Usuń"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-card border rounded-xl p-6 h-fit shadow-sm">
            <h3 className="text-xl font-bold mb-4">Podsumowanie</h3>
            <div className="flex justify-between mb-2 text-muted-foreground">
              <span>Ilość produktów:</span>
              <span>{getTotalItems()} szt.</span>
            </div>
            
            {(session?.user as any)?.role === "BIZ" && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md mb-4 border border-amber-200">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Twój NIP: {(session?.user as any)?.nip || "Brak"} (KSeF)</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-2xl py-4 border-t mb-6">
              <span>Razem:</span>
              <span className="text-primary">{getTotalPrice().toFixed(2)} PLN</span>
            </div>
            
            <button 
              onClick={handleCheckout} 
              disabled={isCheckingOut}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-bold text-lg hover:bg-primary/90 transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
              {isCheckingOut ? "Łączenie ze Stripe..." : "Bezpieczna Płatność"}
            </button>
            <p className="text-xs text-center text-muted-foreground mt-4">Transakcja obsługiwana przez bezpieczną bramkę Stripe.</p>
          </div>
        </div>
      )}
    </div>
  );
}
