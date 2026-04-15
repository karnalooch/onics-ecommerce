"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [isB2B, setIsB2B] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nip, setNip] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nip || !companyName) {
      setError("Zgodnie z wymogami KSeF, podanie NIP-u i nazwy firmy jest obowiązkowe.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nip, companyName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Błąd rejestracji");
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
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏢</div>
          <h2 style={{ marginBottom: '1rem' }}>Rejestracja pomyślna!</h2>
          <div className="alert-box info">
            Twoje konto firmowe zostało zarejestrowane.<br />
            Oczekuj na zatwierdzenie przez Administratora — otrzymasz pełny dostęp po weryfikacji NIP w bazie GUS / KSeF.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/assets/logo.png" alt="CEL-TRONICS" />
        </div>
        <h2>Utwórz konto firmowe</h2>

        <div className="alert-box info">
          Obowiązkowa weryfikacja (Przygotowanie do procedur KSeF).<br/>
          Konto wymaga podania numeru NIP i nazwy firmy.
        </div>

        {error && <div className="alert-box error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="reg-email">E-mail</label>
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jan@firma.pl" />
          </div>
          <div className="form-field">
            <label htmlFor="reg-password">Hasło</label>
            <input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 znaków" />
          </div>
          <div className="form-field">
            <label htmlFor="reg-nip">NIP Firmy *</label>
            <input id="reg-nip" type="text" value={nip} onChange={e => setNip(e.target.value)} required placeholder="Np. 1234567890" maxLength={10} />
          </div>
          <div className="form-field">
            <label htmlFor="reg-company">Nazwa Firmy *</label>
            <input id="reg-company" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Np. Firma Instalacyjna Sp. z o.o." />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Tworzenie konta..." : "Zarejestruj się →"}
          </button>
        </form>

        <p className="auth-footer">
          Masz już konto? <a href="/logowanie">Zaloguj się</a>
        </p>
      </div>
    </div>
  );
}
