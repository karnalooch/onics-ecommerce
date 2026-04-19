"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingWizardV12 } from "./_components/OnboardingWizardV12";
import { Database, ShieldCheck, Zap } from "lucide-react";

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
        setTimeout(() => router.push("/logowanie"), 4000);
      }
    } catch {
      setError("Błąd sieci. Spróbuj ponownie.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-8 bg-[#FDFCFB] dark:bg-[#050505] overflow-hidden">
        {/* SUCCESS BACKGROUND */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full animate-pulse" />
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-modal p-16 rounded-[4rem] text-center max-w-xl relative z-10"
        >
          <div className="p-8 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full w-fit mx-auto mb-8 shadow-xl shadow-emerald-500/10">
             <ShieldCheck className="w-16 h-16" />
          </div>
          <h2 className="text-5xl font-black italic tracking-tighter uppercase mb-6">Witamy w <span className="text-emerald-600 block italic">Siedzi Celtronics</span></h2>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 leading-loose">
            Wniosek o przystąpienie został zarejestrowany. System KSeF / GUS teraz analizuje Twoją tożsamość B2B. <br/>
            <span className="text-emerald-500 mt-4 block">Przekierowanie do Centrum Dowodzenia...</span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center py-20 px-4 bg-[#FDFCFB] dark:bg-[#050505] overflow-hidden">
      {/* V12 BACKGROUND ORCHESTRATION */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full animate-pulse" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center gap-16">
        {/* BRANDING DOCK */}
        <div className="flex flex-col items-center gap-6">
           <div className="p-6 glass-card rounded-[2.5rem] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <Database className="w-10 h-10 text-primary" />
           </div>
           <div className="text-center">
              <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Onboarding <span className="text-primary italic">Zunifikowany</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 mt-4">Protocol: B2B Register V12.0.4</p>
           </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-8 py-4 bg-red-500/10 text-red-600 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-4"
          >
             <Zap className="w-4 h-4 fill-red-600" />
             {error}
          </motion.div>
        )}

        <OnboardingWizardV12 onSubmit={handleRegister} loading={loading} />

        <div className="mt-8 flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
           <span>Zabezpieczenie SSL / KSeF</span>
           <div className="w-1 h-1 bg-slate-300 rounded-full" />
           <a href="/logowanie" className="text-primary hover:underline underline-offset-8 decoration-2 cursor-pointer transition-all">Posiadam Klucz Dostępowy</a>
        </div>
      </div>
    </div>
  );
}
