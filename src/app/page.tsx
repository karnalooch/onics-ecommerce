import Link from "next/link";
import { ShieldCheck, Cpu, HardHat, ArrowRight, Server, Lock, Signal } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* High-Tech Corporate Hero Section */}
      <section className="relative w-full overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.1))] dark:bg-grid-slate-800/30" />
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container relative mx-auto px-6 pt-28 pb-32 md:pt-36 md:pb-48 text-center max-w-5xl">
          <div className="mx-auto flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border border-primary/20 bg-primary/5 px-6 py-2 backdrop-blur-md mb-10 transition-all hover:bg-primary/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-widest text-primary">System Dystrybucji B2B 2.0</p>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 text-foreground">
            Zaufane Dostawy <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
              Technologii SSWiN i CCTV
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 font-medium">
            Profesjonalna platforma dla instalatorów, integratorów i agencji ochrony. 
            Gwarancja dostępności, automatyzacja KSeF i ukryte poziomy cenowe.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href="/logowanie" 
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)]"
            >
              <Lock className="w-5 h-5" /> Zaloguj do Panelu B2B
            </Link>
            <Link 
              href="/produkty" 
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-card border border-border text-foreground px-8 py-4 rounded-xl font-bold hover:bg-muted/50 transition-all shadow-sm"
            >
              Otwarty Katalog (Detal) <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Corporate Bento Grid Section */}
      <section className="bg-muted/30 py-24 border-t border-border">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="mb-16 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Infrastruktura Zakupowa</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">Zaprojektowana by minimalizować czas obsługi zamówień i maksymalizować marżę Twojej firmy instalacyjnej.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Bento Box - KSeF */}
            <div className="md:col-span-2 bg-card border border-border rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              <div className="bg-primary/10 p-5 rounded-2xl shrink-0 z-10">
                <Server className="w-12 h-12 text-primary" />
              </div>
              <div className="z-10 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Automatyzacja Księgowa i KSeF</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Platforma bezszwowo współpracuje z polskim systemem KSeF. Poprawna weryfikacja NIP podczas rejestracji gwarantuje natychmiastowe wystawianie faktur kosztowych i brak opóźnień w logistyce sprzętu.
                </p>
              </div>
            </div>

            {/* Small Bento Box - Certification */}
            <div className="bg-card border border-border rounded-3xl p-10 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-all">
              <div className="bg-primary/10 p-4 rounded-2xl mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Gwarancja Certyfikacji</h3>
              <p className="text-sm text-muted-foreground">
                Urządzenia z certyfikatami Tech, Grade 2 i Grade 3. Gotowe do inwestycji deweloperskich.
              </p>
            </div>

            {/* Small Bento Box - Status */}
            <div className="bg-card border border-border rounded-3xl p-10 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-all">
              <div className="bg-primary/10 p-4 rounded-2xl mb-6">
                <Signal className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Status Magazynu</h3>
              <p className="text-sm text-muted-foreground">
                Aktualizowane w czasie rzeczywistym stany magazynowe. Automatyczne powiadomienia o dostępności.
              </p>
            </div>

            {/* Medium Bento Box - Supply Chain */}
            <div className="md:col-span-2 bg-gradient-to-br from-card to-muted/50 border border-border rounded-3xl p-10 flex flex-col md:flex-row gap-8 items-center shadow-sm hover:shadow-md transition-all">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Łańcuch Dostaw Premium</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Logistyka oparta o najszybszych kurierów. Autoryzowani partnerzy B2B dysponują priorytetowym traktowaniem RMA oraz dedykowanym opiekunem handlowym dla instalacji powyżej 50 kamer.
                </p>
              </div>
              <div className="bg-card border border-border p-5 rounded-2xl shrink-0 shadow-lg">
                <HardHat className="w-12 h-12 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
