"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, KeyRound, Loader2 } from "lucide-react";

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
        setError("Błąd: Nieprawidłowy e-mail lub hasło (sprawdź literówki).");
        setLoading(false);
        return;
      }

      // Bezpieczne odczekanie 1 sekundy by NextAuth zsynchronizował Sesję
      await new Promise(r => setTimeout(r, 1000));
      
      const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
      const session = await sessionRes.json();
      
      if (session?.user?.role === 'ADMIN') {
        window.location.href = "/admin";
      } else if (session?.user?.role === 'BIZ') {
        window.location.href = "/oferty";
      } else {
        window.location.href = "/sklep";
      }
    } catch (err) {
      console.error(err);
      setError("Wystąpił problem techniczny podczas logowania.");
      setLoading(false);
    }
  };

  if (!mounted) return null; // Zabezpieczenie przed błędem wtyczek przeglądarki (omija SSR całkowicie)

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-muted/30 px-4 py-8 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50" />

      <div className="relative w-full max-w-md bg-card border shadow-xl rounded-2xl overflow-hidden p-8 animate-in slide-in-from-bottom-6 duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Konto Instalatora / B2B</h2>
          <p className="text-muted-foreground mt-2 text-sm">Zaloguj się, aby uzyskać dostęp do hurtowych cenników wynegocjowanych dla Twojego NIP-u.</p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md mb-6 border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={(e) => handleSubmit(e)}>
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-semibold text-card-foreground">Adres e-mail</label>
            <input 
              id="login-email" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="adres@twojafirma.pl" 
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-semibold text-card-foreground">Hasło autoryzacyjne</label>
            <input 
              id="login-password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <button 
            type="button" 
            onClick={(e) => handleSubmit(e)}
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2 mt-2"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            {loading ? "Weryfikacja tożsamości..." : "Zaloguj się do systemu"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm border-t pt-6">
          <div className="mb-4 text-left bg-primary/5 p-4 rounded-lg text-xs space-y-1">
            <strong className="text-primary block mb-2 font-bold text-sm">Gotowi Klienci (Demo):</strong>
            <p className="flex justify-between"><span>Admin:</span> <code className="font-bold">admin@celtronics.pl</code></p>
            <p className="flex justify-between"><span>Instalator B2B:</span> <code className="font-bold">instalator@celtronics.pl</code></p>
            <p className="flex justify-between"><span>Detal:</span> <code className="font-bold">detal@celtronics.pl</code></p>
            <div className="text-center mt-2 border-t pt-2 border-primary/10">
              Hasło dla każdego: <strong className="text-base text-primary">test</strong>
            </div>
          </div>
          <p className="text-muted-foreground">
            Brak przydzielonego konta KSeF?&nbsp;
            <a href="/rejestracja" className="text-primary font-semibold hover:underline">
              Zarejestruj nową firmę
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
