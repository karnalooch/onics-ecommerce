import { FC } from 'react';
import { ShieldCheck, Receipt, Cookie, Scale, MapPin } from 'lucide-react';

const PrivacyPolicy: FC = () => {
  return (
    <div className="container mx-auto px-6 py-16 max-w-6xl min-h-screen">
      <div className="mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tighter">Centrum Prawne</h1>
        <p className="text-xl text-muted-foreground font-medium max-w-2xl">Zasady współpracy, polityka prywatności oraz zgodność z systemem KSeF platformy handlowej Celtronics B2B.</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-12 relative">
        {/* Sticky Sidebar Navigation */}
        <aside className="lg:w-1/4 shrink-0">
          <div className="sticky top-28 bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-6">Spis Treści</h3>
            <nav className="flex flex-col gap-4">
              <a href="#rodo" className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" /> 1. Administrator i RODO
              </a>
              <a href="#ceny" className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
                <Receipt className="w-4 h-4 text-primary" /> 2. Polityka Cenowa (KSeF)
              </a>
              <a href="#cookies" className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
                <Cookie className="w-4 h-4 text-primary" /> 3. Polityka Cookies
              </a>
              <a href="#prawne" className="flex items-center gap-3 text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
                <Scale className="w-4 h-4 text-primary" /> 4. Prawa Autorskie
              </a>
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:w-3/4 flex flex-col gap-8">
          
          <section id="rodo" className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group scroll-mt-28">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldCheck className="w-32 h-32 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 tracking-tight relative z-10">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Administrator Danych Osobowych
            </h2>
            <div className="space-y-4 text-muted-foreground relative z-10">
              <p className="leading-relaxed">
                Administratorem Twoich danych osobowych jest <strong>Celtronics S.C.</strong> z siedzibą główną. Przetwarzamy Twoje dane wyłącznie w celu realizacji zamówień, procesów reklamacyjnych (RMA) oraz celów podatkowych.
              </p>
              <div className="bg-muted/50 p-4 rounded-xl flex items-start gap-4 border border-border/50">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-foreground">Adres siedziby:</p>
                  <p>ul. Niklowa 22, 08-110 Siedlce</p>
                  <p className="mt-2">Email: <a href="mailto:biuro@celtronics.pl" className="text-primary hover:underline">biuro@celtronics.pl</a> | Tel: +48 123 456 789</p>
                </div>
              </div>
              <p className="leading-relaxed text-sm">
                System wymaga weryfikacji NIP w celu utworzenia zaufanego profilu B2B. Powierzone dane są chronione szyfrowaniem SSL i nie są udostępniane podmiotom trzecim w celach marketingowych.
              </p>
            </div>
          </section>

          <section id="ceny" className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group scroll-mt-28">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Receipt className="w-32 h-32 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 tracking-tight relative z-10">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Polityka Cenowa B2B i KSeF
            </h2>
            <div className="space-y-4 text-muted-foreground relative z-10">
              <p className="leading-relaxed">
                W ogólnodostępnym katalogu <strong>B2C</strong> wszystkie widoczne ceny uwzględniają podatek VAT (kwoty brutto). Zakupy w tej strefie nie wymagają posiadania zautoryzowanego konta firmowego.
              </p>
              <div className="border-l-4 border-primary pl-4 py-1 my-6 bg-primary/5 rounded-r-xl">
                <p className="font-semibold text-foreground">Strefa Partnerów B2B (Kwoty Netto)</p>
                <p className="text-sm mt-2">W panelu instalatora, ceny wyliczane są <strong>netto</strong> i uwzględniają zindywidualizowane poziomy rabatowe (Tiery A/B/C).</p>
              </div>
              <p className="leading-relaxed">
                Podczas rejestracji konta B2B, nasz system automatycznie łączy się z bazą VIES/GUS. Jest to rygorystyczny wymóg przygotowany pod asynchroniczną integrację z systemem <strong>Krajowego Systemu e-Faktur (KSeF)</strong>.
              </p>
            </div>
          </section>

          <section id="cookies" className="bg-card border border-border p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group scroll-mt-28">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Cookie className="w-32 h-32 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 tracking-tight relative z-10">
              <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              Polityka Cookies i Zabezpieczenia
            </h2>
            <div className="space-y-4 text-muted-foreground relative z-10">
              <p className="leading-relaxed">
                Witryna Celtronics.pl korzysta z absolutnie minimalnej ilości plików cookies. Ograniczamy się wyłącznie do plików <strong>niezbędnych technicznie</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm mt-4">
                <li><strong className="text-foreground">Sesyjne Tokeny Autoryzacyjne:</strong> Wymagane przez bibliotekę NextAuth do zapobiegania atakom typu CSRF.</li>
                <li><strong className="text-foreground">Cache UI:</strong> Przechowywanie informacji o wybranym motywie (Jasny/Ciemny) w celu uniknięcia migotania ekranu (tzw. FOUC).</li>
                <li><strong className="text-foreground">Integracje Płatnicze:</strong> Ciasteczka wymagane przez operatora Stripe dla bezpieczeństwa transakcji (ochrona webhooks i Przelewy24).</li>
              </ul>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
