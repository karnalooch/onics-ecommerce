"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingMissionControl } from "./_components/OnboardingMissionControl";
import { ShieldCheck, Zap, ArrowLeft, Database } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (data: any) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Błąd rejestracji");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/logowanie"), 3000);
      }
    } catch {
      setError("Błąd sieci. Spróbuj ponownie.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
        <div className="technical-panel p-8 text-center max-w-sm border-emerald-200 bg-emerald-50/10">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
             <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-black uppercase tracking-tight mb-2">Wniosek Przyjęty</h2>
          <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">
            Trwa weryfikacja tożsamości B2B (GUS / KSeF). <br/>
            Przekierowanie do logowania za moment...
          </p>
          <div className="mt-6 flex justify-center">
             <div className="w-12 h-0.5 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[loading_3s_ease-in-out_infinite]" />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-8 max-w-3xl mx-auto px-4">
      {/* MISSION CONTROL REGISTRATION HEADER */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-primary text-white rounded flex items-center justify-center">
              <Database className="w-5 h-5" />
           </div>
           <div>
              <h1 className="text-xs font-black uppercase tracking-widest">Rejestracja Kontrahenta B2B</h1>
              <div className="flex items-center gap-2 mt-0.5 opacity-60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-muted-foreground uppercase tracking-tight font-bold">Celtronics Merchant Onboarding Protocol</p>
              </div>
           </div>
        </div>
        <Link href="/logowanie" className="text-[10px] font-black text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 uppercase tracking-widest border border-border px-3 py-1.5 rounded hover:bg-secondary">
           <ArrowLeft className="w-3 h-3" /> Powrót
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-3 animate-in slide-in-from-top-2">
           <Zap className="w-3.5 h-3.5 fill-red-600" />
           {error}
        </div>
      )}

      {/* THE WIZARD */}
      <div className="technical-panel p-0 overflow-hidden bg-white shadow-sm">
          <OnboardingMissionControl onSubmit={handleRegister} loading={loading} />
      </div>

      {/* FOOTER INFO */}
      <div className="flex justify-center gap-8 text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">
         <span className="flex items-center gap-1.5"><ShieldCheck className="w-2.5 h-2.5" /> AES-256</span>
         <span>RODO / KSeF</span>
         <span>Security Verified</span>
      </div>
    </div>
  );
}
