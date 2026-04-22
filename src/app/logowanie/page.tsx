"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  KeyRound, 
  Loader2, 
  ShieldCheck,
  ChevronLeft,
  Database,
  Terminal,
  Activity
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("AUTORYZACJA_ODRZUCONA: Błędne dane uwierzytelniające.");
        setLoading(false);
        return;
      }

      await new Promise(r => setTimeout(r, 600));
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (session?.user?.role === 'ADMIN') {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError("NODE_FAILURE: Awaria węzła autoryzacyjnego.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full bg-background select-none font-sans overflow-hidden">
      
      {/* 1. BRANDING PANEL (FLUENT MICA GRADIENT) */}
      <div className="hidden lg:flex w-[48%] bg-gradient-to-br from-[#1e2335] via-[#2a2f45] to-[#4a5568] text-white relative items-center justify-center overflow-hidden border-r border-white/5">
        {/* Modern Interactive Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ 
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }} />
        
        {/* Animated Background Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 blur-[100px] rounded-full" />

        <div className="relative z-10 flex flex-col px-24 w-full max-w-[800px]">
           <motion.div 
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className="w-20 h-20 bg-primary text-white flex items-center justify-center mb-12 rounded-3xl shadow-[0_20px_50px_rgba(0,120,212,0.4)]"
           >
              <ShieldCheck className="w-10 h-10 shadow-glow" />
           </motion.div>
           
           <div className="space-y-6">
              <div className="flex items-center gap-5">
                 <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-primary">Security_Auth_v9</span>
                 <div className="h-[1px] flex-1 bg-white/10" />
              </div>
              <h1 className="text-7xl font-extrabold text-white tracking-tight leading-[0.9]">
                 B2B HUB<br />
                 <span className="text-white/40">CELTRONICS.</span>
              </h1>
           </div>
           
           <p className="text-slate-300 text-lg font-medium max-w-md leading-relaxed mt-12 opacity-80">
              Autoryzowany dostęp do ekosystemu instalatorskiego. <br/>
              Weryfikacja tożsamości partnera: AKTYWNA.
           </p>

           <div className="mt-20 grid grid-cols-2 gap-12 border-t border-white/10 pt-12">
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Węzeł Operacyjny</span>
                 <span className="text-[13px] font-bold text-white uppercase italic tracking-tight">Sync: Stable</span>
              </div>
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Technologia</span>
                 <span className="text-[13px] font-bold text-white uppercase italic tracking-tight">Fluent Mica</span>
              </div>
           </div>
        </div>

        {/* Operational Watermark */}
        <div className="absolute bottom-12 left-24 flex items-center gap-4 text-[11px] font-bold text-white/20 tracking-[0.4em] uppercase italic">
           <Activity className="w-5 h-5" />
           CORE_ENGINE_2026_V9
        </div>
      </div>

      {/* 2. OPERATIONAL PANEL (FORM - PURE WHITE CANVAS) */}
      <div className="flex-1 flex items-center justify-center p-12 bg-white dark:bg-[#0a0a0a] relative">
        
        <Link 
          href="/" 
          className="absolute top-12 right-12 flex items-center gap-3 text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-all active:scale-95 px-6 py-2 bg-black/5 dark:bg-white/5 rounded-full"
        >
          <ChevronLeft className="w-4 h-4" /> POWRÓT
        </Link>
        
        <div className="w-full max-w-[440px] space-y-16">
          
          <div className="space-y-4">
            <h2 className="text-5xl font-extrabold text-foreground tracking-tight">Zaloguj się</h2>
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-glow" />
               <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Oczekiwanie na poświadczenia B2B...</p>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 text-red-500 text-[11px] p-6 font-bold uppercase tracking-widest border border-red-500/20 rounded-2xl flex items-center gap-5"
            >
              <ShieldAlert className="w-6 h-6 shrink-0" />
              {error}
            </motion.div>
          )}

          <form className="space-y-10" onSubmit={(e) => handleSubmit(e)}>
            <div className="space-y-3">
              <label htmlFor="login-email" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                 Identyfikator Konta
              </label>
              <div className="relative group">
                 <Database className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                 <input 
                   id="login-email" 
                   type="email" 
                   value={email} 
                   onChange={e => setEmail(e.target.value)} 
                   required 
                   placeholder="E-MAIL PARTNERA" 
                   className="w-full h-16 pl-14 bg-blue-50/50 dark:bg-white/5 border border-transparent text-[14px] font-bold text-foreground uppercase outline-none focus:border-primary/20 focus:bg-white dark:focus:bg-white/10 transition-all rounded-2xl shadow-inner"
                 />
              </div>
            </div>
            
            <div className="space-y-3">
              <label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                 Klucz Dostępowy
              </label>
              <div className="relative group">
                 <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                 <input 
                   id="login-password" 
                   type="password" 
                   value={password} 
                   onChange={e => setPassword(e.target.value)} 
                   required 
                   placeholder="*************" 
                   className="w-full h-16 pl-14 bg-blue-50/50 dark:bg-white/5 border border-transparent text-[14px] font-bold text-foreground outline-none focus:border-primary/20 focus:bg-white dark:focus:bg-white/10 transition-all rounded-2xl shadow-inner"
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-primary text-white text-[12px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-4 active:scale-95 shadow-[0_20px_40px_rgba(0,120,212,0.3)] disabled:opacity-50 transition-all hover:brightness-110 rounded-2xl"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <KeyRound className="h-6 w-6 shadow-glow" />
              )}
              {loading ? "WERYFIKACJA..." : "AUTORYZUJ_DOSTĘP"}
            </button>
          </form>

          {/* VERIFICATION NODE INFO (DEMO HUB) */}
          <div className="pt-12 border-t border-black/5 dark:border-white/5">
             <div className="bg-primary/5 p-8 rounded-[24px] space-y-8 border border-primary/10">
                <div className="flex items-center gap-3">
                   <h3 className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Dostęp Deweloperski:</h3>
                </div>
                <div className="grid grid-cols-1 gap-8">
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identyfikator Testowy</span>
                      <code className="text-[13px] font-bold text-foreground bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-black/5 dark:border-white/10">admin@celtronics.pl</code>
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Klucz Testowy</span>
                      <code className="text-[13px] font-bold text-primary bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-primary/20">test</code>
                   </div>
                </div>
             </div>
          </div>

          <div className="text-center space-y-6">
             <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
               Brak autoryzacji w systemie?
             </p>
             <Link 
               href="/rejestracja" 
               className="inline-block h-12 px-10 border border-foreground text-foreground font-bold text-[11px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-all active:scale-95 rounded-2xl"
             >
               REJESTRACJA NOWEGO WĘZŁA
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
