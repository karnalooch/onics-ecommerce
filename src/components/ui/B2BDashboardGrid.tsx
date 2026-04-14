"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { QuoteRequestModal } from "./QuoteRequestModal";

interface B2BDashboardGridProps {
  nip: string;
  email: string;
}

export function B2BDashboardGrid({ nip, email }: B2BDashboardGridProps) {
  const [activeQuoteProduct, setActiveQuoteProduct] = useState<{ id: string, name: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => {
          const price = 400 + i * 50;
          const name = `Płyta Główna Asus Z${i}0 (Multi-Pack)`;
          const id = String(i);

          return (
            <div key={id} className="border p-6 rounded-2xl bg-card shadow-sm hover:shadow-lg transition-all animate-in fade-in zoom-in duration-500">
              <div className="bg-muted w-full h-32 rounded-lg mb-4 flex items-center justify-center text-muted-foreground text-sm font-mono">
                [HURT_IMG_{i}]
              </div>
              <h3 className="font-bold text-lg mb-2 leading-tight">{name}</h3>
              <p className="text-secondary-foreground mb-4">Stawka B2B: <span className="font-extrabold text-green-600 text-xl">{price.toFixed(2)} PLN Netto</span></p>
              
              <button 
                onClick={() => setActiveQuoteProduct({ id, name })}
                className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3 rounded-xl font-semibold hover:bg-foreground/90 transition shadow-sm active:scale-95"
              >
                <CopyPlus className="w-5 h-5" />
                Dostosuj i Złóż Zapytanie
              </button>
            </div>
          );
        })}
      </div>

      {activeQuoteProduct && (
        <QuoteRequestModal 
          productId={activeQuoteProduct.id}
          productName={activeQuoteProduct.name}
          companyNip={nip}
          clientEmail={email}
          onClose={() => setActiveQuoteProduct(null)}
        />
      )}
    </>
  );
}
