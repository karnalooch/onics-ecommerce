"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, 
  KeyRound, 
  Loader2, 
  ArrowLeft, 
  Fingerprint, 
  ShieldCheck,
  Activity,
  Terminal
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

      await new Promise(r => setTimeout(r, 800));
      
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = await sessionRes.json();
      
      if (session?.user?.role === 'ADMIN') {
        window.location.href = "/admin";
      } else if (session?.user?.role === 'BIZ') {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/sklep";
      }
    } catch (err) {
      console.error(err);
      setError("NODE_FAILURE: Awaria węzła autoryzacyjnego. Spróbuj ponownie.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-full bg-slate-50 font-mono overflow-hidden select-none">
      
      {/* 1. TECHNICAL BRAND PANEL (DHL/SATEL LEFT COLUMN) */}
      <div className="hidden lg:flex w-2/5 bg-slate-950 relative items-center justify-center border-r-2 border-slate-900 overflow-hidden">
        
        {/* Engineering Background Pattern (No Image needed) */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '20px 20px'
        }} />
        
        <div className="relative z-10 w-full px-16 space-y-12">
           <div className="flex flex-col gap-4">
              <div className="w-16 h-16 bg-primary text-slate-950 flex items-center justify-center rounded-none shadow-3xl shadow-primary/20 animate-in zoom-in duration-700">
                 <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                 <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Authentication</h1>
                 <p className="text-[10px] font-black uppercase text-primary tracking-[0.4em] italic">Elite_Engineering_Core</p>
              </div>
           </div>

           <div className="space-y-6">
              {[
                { i: <Fingerprint className="w-4 h-4" />, t: "Secure Link v4.2 ESTABLISHED" },
                { i: <Activity className="w-4 h-4" />, t: "Mainframe Heartbeat: OPTIMAL" },
                { i: <Terminal className="w-4 h-4" />, t: "B2B Protocol_Activated" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 text-slate-500 opacity-60">
                   <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center">
                      {item.i}
                   </div>
                   <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{item.t}</span>
                </div>
              ))}
           </div>

           <div className="pt-10 border-t border-white/5 opacity-30">
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                Platforma zastrzeżona wyłącznie dla autoryzowanych instalatorów i partnerów technicznych Celtronics S.C.
              </p>
           </div>
        </div>
      </div>

      {/* 2. OPERATIONAL WORKSPACE (WHITE FORM AREA) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white relative">
        
        <Link 
          href="/" 
          className="absolute top-10 right-10 flex items-center gap-3 text-[10px] font-black text-slate-400 hover:text-slate-950 uppercase tracking-[0.2em] transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" /> Powrót do Strony Głównej
        </Link>
        
        <div className="w-full max-w-sm space-y-10 animate-in fade-in slide-in-from-right-10 duration-700">
          <div className="space-y-2 border-l-4 border-slate-950 pl-6">
            <h2 className="text-2xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">Partner Access</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedura autoryzacji systemowej</p>
          </div>

          {error && (
            <div className="bg-status-error/10 text-status-error text-[10px] p-4 font-black uppercase tracking-widest border border-status-error/20 animate-in shake duration-500 flex items-center gap-4">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
            <div className="space-y-2 group">
              <label htmlFor="login-email" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Konto_Ident_E-mail</label>
              <div className="relative">
                 <input 
                   id="login-email" 
                   type="email" 
                   value={email} 
                   onChange={e => setEmail(e.target.value)} 
                   required 
                   placeholder="IDENT@FIRMA.PL" 
                   className="w-full h-12 bg-slate-50 border-2 border-slate-100 px-4 text-[11px] font-bold text-slate-950 uppercase tracking-widest outline-none focus:border-primary focus:bg-white transition-all active:shadow-inner"
                 />
              </div>
            </div>
            
            <div className="space-y-2 group">
              <label htmlFor="login-password" className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Klucz_Kodowany</label>
              <div className="relative">
                 <input 
                   id="login-password" 
                   type="password" 
                   value={password} 
                   onChange={e => setPassword(e.target.value)} 
                   required 
                   placeholder="••••••••••••" 
                   className="w-full h-12 bg-slate-50 border-2 border-slate-100 px-4 text-[11px] font-bold text-slate-950 uppercase tracking-widest outline-none focus:border-primary focus:bg-white transition-all active:shadow-inner"
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 bg-slate-950 text-white text-[11px] font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-4 hover:bg-primary hover:text-slate-950 transition-all active-press active-inset shadow-xl shadow-slate-950/20 disabled:opacity-50 mt-4 group"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              )}
              {loading ? "WERYFIKACJA..." : "AUTORYZUJ DOSTĘP"}
            </button>
          </form>

          {/* DENSE TECHNICAL MOCK DATA (ONLY FOR DEMO) */}
          <div className="pt-8 border-t border-slate-100">
             <div className="bg-slate-50 p-4 space-y-4">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="w-4 h-4 text-status-success" />
                   <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Tryb Weryfikacji: Środowisko Testowe</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Login Admin</span>
                      <code className="text-[10px] font-black text-slate-600">admin@celtronics.pl</code>
                   </div>
                   <div className="flex flex-col gap-1 items-end text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Hasło Universal</span>
                      <code className="text-[10px] font-black text-primary">test</code>
                   </div>
                </div>
             </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Brak certyfikatu? <Link href="/rejestracja" className="text-primary hover:underline decoration-2 underline-offset-4">Wniosek o Rejestrację B2B</Link>
          </p>
        </div>

        {/* Operational Watermark */}
        <div className="absolute bottom-10 right-10 text-[60px] font-black text-slate-50 select-none pointer-events-none -z-10 tracking-tighter">
           CRT_SECURE
        </div>
      </div>
    </div>
  );
}
