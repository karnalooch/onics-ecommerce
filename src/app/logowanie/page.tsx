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
    <div className="flex h-screen w-full bg-white select-none font-sans overflow-hidden no-blur">
      
      {/* 1. BRANDING PANEL (NAVY BLOCK - SATEL STYLE) */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-b from-[#1e2335] to-[#cbd5e1] text-white relative items-center justify-center overflow-hidden">
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }} />
        
        <div className="relative z-10 flex flex-col px-24 w-full">
           <div className="w-16 h-16 bg-primary text-white flex items-center justify-center mb-10 rounded-none shadow-2xl">
              <ShieldCheck className="w-8 h-8" />
           </div>
           
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary italic">Secure_Auth_V4</span>
                 <div className="h-px flex-1 bg-slate-800" />
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">
                 PLATFORMA<br />ELITE_B2B
              </h1>
           </div>
           
           <p className="text-slate-400 text-sm font-bold max-w-md leading-relaxed mt-10 uppercase tracking-widest italic opacity-60">
              Terminal dostępowy sektora security. <br/>
              Weryfikacja tożsamości instalatora: AKTYWNA.
           </p>

           <div className="mt-20 grid grid-cols-2 gap-8 border-t border-slate-900 pt-10">
              <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Węzeł_Danych</span>
                 <span className="text-[11px] font-black text-white uppercase italic">WF-MAG_SYNC_OK</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Szyfrowanie</span>
                 <span className="text-[11px] font-black text-white uppercase italic">AES_256_GCM</span>
              </div>
           </div>
        </div>

        {/* Operational Watermark */}
        <div className="absolute bottom-12 left-24 flex items-center gap-4 text-[10px] font-black text-white/10 tracking-[0.4em] uppercase leading-none italic">
           <Activity className="w-4 h-4" />
           CELTRONICS_CORE_ENGINE_2026
        </div>
      </div>

      {/* 2. OPERATIONAL PANEL (FORM - PURE WHITE) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        
        <Link 
          href="/" 
          className="absolute top-12 left-12 flex items-center gap-3 text-[10px] font-black text-slate-300 hover:text-slate-950 uppercase tracking-widest transition-all active-press"
        >
          <ChevronLeft className="w-4 h-4" /> REZYGNACJA
        </Link>
        
        <div className="w-full max-w-[420px] space-y-12">
          
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-slate-950 tracking-tighter uppercase italic">Logowanie_Do_Węzła</h2>
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Oczekiwanie na poświadczenia B2B...</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-600 text-white text-[10px] p-4 font-black uppercase tracking-widest border border-red-700 animate-in shake duration-500 flex items-center gap-4">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-8" onSubmit={(e) => handleSubmit(e)}>
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                 Identyfikator_Konta
              </label>
              <div className="relative">
                 <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                 <input 
                   id="login-email" 
                   type="email" 
                   value={email} 
                   onChange={e => setEmail(e.target.value)} 
                   required 
                   placeholder="ADMIN_PROMPT@CELTRONICS.PL" 
                   className="w-full h-14 pl-12 bg-blue-50/60 border border-transparent text-[12px] font-black text-slate-950 uppercase tracking-widest outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                 />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
                 Klucz_Dostępowy
              </label>
              <div className="relative">
                 <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                 <input 
                   id="login-password" 
                   type="password" 
                   value={password} 
                   onChange={e => setPassword(e.target.value)} 
                   required 
                   placeholder="*************" 
                   className="w-full h-14 pl-12 bg-blue-50/60 border border-transparent text-[12px] font-black text-slate-950 uppercase tracking-widest outline-none focus:border-primary focus:bg-white transition-all shadow-sm"
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 active-press shadow-lg shadow-blue-500/40 disabled:opacity-50 mt-4 italic transition-all hover:brightness-110"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
              {loading ? "WERYFIKACJA_IQ..." : "AUTORYZUJ_DOSTĘP"}
            </button>
          </form>

          {/* VERIFICATION NODE INFO (DEMO HUB) */}
          <div className="pt-10 border-t border-slate-100">
             <div className="bg-slate-50 p-8 border border-slate-100 space-y-6">
                <div className="flex items-center gap-3">
                   <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] italic">WĘZEŁ_DEMO_LOGS:</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                   <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Admin_Identity</span>
                      <code className="text-[11px] font-black text-slate-950 bg-white px-2 py-1 border border-slate-100">admin@celtronics.pl</code>
                   </div>
                   <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Master_Pass</span>
                      <code className="text-[11px] font-black text-primary bg-white px-2 py-1 border border-primary/20">test</code>
                   </div>
                </div>
             </div>
          </div>

          <div className="text-center space-y-4">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">
               Nie posiadasz autoryzacji B2B?
             </p>
             <Link 
               href="/rejestracja" 
               className="inline-block h-10 px-8 border-2 border-slate-950 text-slate-950 font-black text-[9px] uppercase tracking-widest hover:bg-slate-950 hover:text-white transition-all active-press italic"
             >
               REJESTRACJA_NOWEGO_WĘZŁA
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
