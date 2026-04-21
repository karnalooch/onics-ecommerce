"use client";

import { useState } from "react";
import { X, Send, Loader2, Building2, Terminal, ShieldCheck, Database, Box } from "lucide-react";

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
        setTimeout(onClose, 2500);
      } else {
        alert("FAULT: Błąd integracji z API_GATEWAY.");
      }
    } catch {
      alert("FAULT: Brak połączenia z klastrem sieciowym.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 transition-all animate-in fade-in duration-300 no-blur select-none" suppressHydrationWarning>
      <div className="bg-white w-full max-w-xl border-2 border-slate-950 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500 shadow-2xl">
        
        {/* OPERATIONAL_MODAL_HEADER */}
        <div className="flex justify-between items-center p-6 border-b-2 border-slate-950 bg-slate-950 text-white relative">
          <div className="flex items-center gap-4">
            <Terminal className="w-5 h-5 text-primary" />
            <div className="flex flex-col">
               <h3 className="font-black text-xs uppercase tracking-[0.3em] italic leading-none">Indywidualna_Wycena_Hurt</h3>
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Node_ID: QRT-{Math.floor(Math.random()*1000)}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-all active-press">
             <X className="w-6 h-6 text-slate-400"/>
          </button>
        </div>

        {/* TERMINAL_BODY */}
        <div className="flex-1" suppressHydrationWarning>
          {success ? (
            <div className="p-16 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-slate-50 border-2 border-status-success flex items-center justify-center shadow-xl shadow-status-success/10">
                <Send className="w-8 h-8 text-status-success" />
              </div>
              <div className="space-y-2">
                 <h4 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950">ZAPYTANIE_WYPROMOWANE_DO_PIM</h4>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-relaxed italic">Instalatorze, Twój wniosek o wolumen został zarejestrowany. Analiza handlowa zostanie przesłana na adres {clientEmail} w ciągu 24h.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="bg-slate-50 border-2 border-slate-100 p-6 flex flex-col relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                   <Box className="w-16 h-16" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-2">DOTYCZY_ASORTYMENTU_ID:</span>
                <span className="font-black text-xl italic text-slate-950 leading-none uppercase truncate">{productName}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Oczekiwany Wolumen (szt.)</label>
                  <div className="relative group">
                     <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
                     <input 
                       type="number" min="1" required 
                       value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                       className="w-full h-12 pl-12 bg-white border-2 border-slate-100 px-4 text-[13px] font-black tabular-nums italic outline-none focus:border-slate-950 transition-all font-mono" 
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Identyfikator Podmiotu (NIP)</label>
                  <div className="w-full h-12 flex items-center px-4 bg-slate-50 border-2 border-slate-100 text-slate-400 font-mono text-[13px] tabular-nums font-black italic">
                     {companyNip}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Notatki Projektowe (Opcjonalne)</label>
                <textarea 
                  rows={4} placeholder=" np. Termin realizacji przetargu, wymagane certyfikaty dodatkowe..."
                  value={message} onChange={e => setMessage(e.target.value)}
                  className="w-full p-4 bg-white border-2 border-slate-100 text-[12px] font-black uppercase italic outline-none focus:border-slate-950 transition-all resize-none font-mono"
                ></textarea>
              </div>

              <div className="pt-6 border-t-2 border-slate-50 flex flex-col sm:flex-row justify-end gap-4">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-8 h-12 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-950 transition-all italic"
                >
                  [ ANULUJ_PROCES ]
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-10 h-12 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-primary active-press shadow-xl shadow-primary/10 italic"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4 text-primary" />}
                  WYŚLIJ_ZAPYTANIE_O_PROJEKT
                </button>
              </div>
            </form>
          )}
        </div>

        {/* MODAL_FOOTER_STATUS */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-status-success rounded-none" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Encrypted_B2B_Socket_Active</span>
           </div>
           <ShieldCheck className="w-3.5 h-3.5 text-slate-200" />
        </div>

      </div>
    </div>
  );
}
