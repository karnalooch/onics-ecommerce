"use client";

import { useState } from "react";
import { X, Send, Loader2, Building2 } from "lucide-react";

interface QuoteModalProps {
  productId: string;
  productName: string;
  companyNip: string;
  clientEmail: string;
  onClose: () => void;
}

export function QuoteRequestModal({ productId, productName, companyNip, clientEmail, onClose }: QuoteModalProps) {
  const [quantity, setQuantity] = useState<number>(10);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productName, expectedQuantity: quantity, message, companyNip, clientEmail }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 2500); // Zamknij po sukcesie
      } else {
        alert("Błąd integracji z API. Spróbuj ponownie.");
      }
    } catch {
      alert("Brak połączenia z siecią.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Indywidualna Wycena</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground transition"><X className="w-5 h-5"/></button>
        </div>

        {/* Form Body */}
        {success ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold mb-2">Zapytanie przesłane!</h4>
            <p className="text-muted-foreground">Nasz opiekun biznesowy odniesie się do wolumenu w ciągu 24h na Twój e-mail.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex flex-col">
              <span className="text-xs font-semibold text-primary/70 uppercase">Dotyczy asortymentu</span>
              <span className="font-bold text-foreground">{productName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Oczekiwany Wolumen (szt.)</label>
                <input 
                  type="number" min="1" required 
                  value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Powiązany NIP Działalności</label>
                <div className="w-full p-2 border rounded-md bg-muted text-muted-foreground font-mono truncate">{companyNip}</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Opcjonalna wiadomość handlowa</label>
              <textarea 
                rows={4} placeholder="Dodatkowe uwagi dotyczące terminów przetargów, dostaw..."
                value={message} onChange={e => setMessage(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary outline-none resize-none"
              ></textarea>
            </div>

            <div className="pt-2 border-t flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md hover:bg-muted font-medium text-muted-foreground transition">Anuluj</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Opłać i Wyślij Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
