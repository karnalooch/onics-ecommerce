"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, KeyRound, Loader2, ArrowLeft } from "lucide-react";
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
        setError("Autoryzacja odrzucona. Sprawdź poprawność danych konta.");
        setLoading(false);
        return;
      }

      await new Promise(r => setTimeout(r, 1000));
      
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
      setError("Awaria węzła autoryzacyjnego KSeF. Spróbuj ponownie.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Panel: High-Tech Secure Vault (Brand Side) */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
        <img 
          src="/auth_split_banner_1776462089456.png" 
          alt="Secure Data Center" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        <div className="relative z-10 text-white max-w-lg px-12 text-center">
          <div className="bg-primary/20 backdrop-blur-md p-4 w-fit rounded-2xl mx-auto mb-8 border border-white/10">
            <ShieldAlert className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Autoryzacja B2B</h1>
          <p className="text-lg text-slate-300 font-medium leading-relaxed">
            Dostęp do hurtowego cennika instalatorskiego oraz certyfikowanych systemów bezpieczeństwa. 
            Moduł zintegrowany asynchronicznie z KSeF.
          </p>
        </div>
      </div>

      {/* Right Panel: Clean Corporate Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <Link 
          href="/" 
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Powrót 
        </Link>
        
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">Panel Partnera</h2>
            <p className="text-muted-foreground font-medium">Wprowadź poświadczenia dostępowe poniżej.</p>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-xl border border-destructive/20 font-bold mb-6 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Konto (E-mail)</label>
              <input 
                id="login-email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="nazwa@twojafirma.pl" 
                className="w-full flex h-14 rounded-xl border border-border bg-card/50 px-4 py-2 text-base font-medium ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hasło Szyfrowane</label>
              <input 
                id="login-password" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••••••" 
                className="w-full flex h-14 rounded-xl border border-border bg-card/50 px-4 py-2 text-base font-medium ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent transition-all"
              />
            </div>

            <button 
              type="button" 
              onClick={(e) => handleSubmit(e)}
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-xl text-base font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-14 shadow-[0_0_30px_-5px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.5)] disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-5 w-5" />
              )}
              {loading ? "Autoryzacja węzła..." : "Zaloguj do Panelu"}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-border">
            <div className="bg-muted/30 p-5 rounded-2xl border border-border space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-4">Węzeł Weryfikacyjny (Środowisko Demo):</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-muted-foreground text-xs mb-1">Dostęp Admina</span>
                  <code className="font-bold text-foreground bg-background px-2 py-1 rounded">admin@celtronics.pl</code>
                </div>
                <div>
                  <span className="block text-muted-foreground text-xs mb-1">Konto B2B</span>
                  <code className="font-bold text-foreground bg-background px-2 py-1 rounded">instalator@celtronics.pl</code>
                </div>
              </div>
              <div className="mt-4 text-center bg-background py-2 rounded-lg border border-border/50">
                <span className="text-xs text-muted-foreground">Hasło główne:</span> <strong className="text-primary font-black ml-2 text-sm italic">test</strong>
              </div>
            </div>
            
            <p className="text-center text-sm text-muted-foreground mt-8 font-medium">
              Nie posiadasz aktywnego certyfikatu KSeF? <br />
              <a href="/rejestracja" className="text-primary font-bold hover:underline decoration-2 underline-offset-4 transition-all">Rozpocznij proces weryfikacyjny</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
