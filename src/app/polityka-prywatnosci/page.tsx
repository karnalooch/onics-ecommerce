import { FC } from 'react';

// Statyczna strona wizytówkowa / prywatności oparta na statycznym renderowaniu (SSG)
const PrivacyPolicy: FC = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 border-b pb-4">Polityka Prywatności i Informacje Prawne</h1>
      
      <section className="mb-10 bg-card p-8 rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold mt-8 mb-4">1. Administrator Danych Osobowych</h2>
        <p className="text-muted-foreground mb-4">
          Administratorem Twoich danych osobowych jest <strong>Celtronics S.C.</strong> z siedzibą w Siedlcach (ul. Niklowa 22, 08-110 Siedlce). Posiadamy także autoryzowany salon sprzedaży przy ul. Kilińskiego 39D. W sprawach związanych z RODO oraz KSeF zachęcamy do kontaktu pod adresem email: biuro@celtronics.pl lub telefonicznie: +48 123 456 789.
        </p>
        <p className="text-muted-foreground">
          System wymusza weryfikację kont za pomocą Numeru Identyfikacji Podatkowej (NIP) dla prawidłowego wystawiania F-VAT.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-primary">2. Polityka Cenowa B2B / B2C (VAT, KSeF)</h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Wszystkie <strong>ceny detaliczne B2C</strong> widniejące w ogólnodostępnym katalogu uwzględniają podatek VAT (są to kwoty brutto). 
          Osoby dokonujące zakupów za pośrednictwem systemu B2C nie są zobligowane do podawania numeru NIP (chyba że zażądają wystawienia FV).
        </p>
        <p className="text-muted-foreground leading-relaxed">
          W panelach <strong>Partnerów B2B</strong> (zabezpieczonych hasłem) wyświetlane ceny są zawsze wartościami <strong>netto</strong>.
          Podczas rejestracji system rygorystycznie weryfikuje podany nr NIP za pomocą bazy VIES/GUS z naciskiem 
          na integrację asynchroniczną z modułem Krajowego Systemu e-Faktur (KSeF).
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-primary">3. Polityka Cookies</h2>
        <p className="text-muted-foreground leading-relaxed">
          Witryna wykorzystuje pliki sesyjne w procesowaniu zabezpieczeń CSRF (Cross-Site Request Forgery) związanych z autoryzacją kont instalatorskich przez NextAuth.
          Serwis korzysta z platformy Stripe do obsługi płatności, która implementuje technologię webhooks (nasłuchiwanie poprawności transakcji Przelewy24 / BLIK).
        </p>
      </section>

    </div>
  );
};

export default PrivacyPolicy;
