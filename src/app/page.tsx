import Link from "next/link";
import { ShieldCheck, Cpu, HardHat, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid-slate-200/20 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-800/20" />
        <div className="container relative mx-auto px-4 pt-24 pb-32 md:pt-32 md:pb-40 text-center">
          <div className="mx-auto flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border border-primary/20 bg-primary/10 px-7 py-2 backdrop-blur transition-all hover:border-primary/30 hover:bg-primary/20 mb-8 animate-in slide-in-from-top-4 duration-500">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Nowa Dystrybucja B2B (2026)</p>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 drop-shadow-sm">
            Inteligentne
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 block sm:inline"> Systemy Bezpieczeństwa</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12">
            Najbardziej opłacalny E-commerce dla instalatorów i deweloperów. 
            CCTV, Kontrola Dostępu, SWN i systemy ppoż - dostępne od ręki z magayznu.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href="/logowanie" 
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 hover:scale-105 transition-all shadow-lg"
            >
              <HardHat className="w-5 h-5" /> Strefa Instalatora B2B
            </Link>
            <Link 
              href="/produkty" 
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-background border-2 border-input text-foreground px-8 py-4 rounded-lg font-semibold hover:bg-muted transition-all"
            >
              Zobacz Detal B2C <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Wyroznienia (Features) */}
      <section className="border-t bg-muted/40 py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Cpu className="w-10 h-10 text-primary" />}
              title="Automatyzacja i KSeF"
              desc="Jesteśmy gotowi na e-Fakturowanie. Księgowanie kont biznesowych jest sprzężone z wyznaczonym rygorem systemu podatkowego."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-10 h-10 text-primary" />}
              title="Certyfikowane Urządzenia"
              desc="Posiadamy wyłącznie systemy testowane, objęte lokalną gwarancją serwisową, idealne pod przetargi publiczne i duże inwestycje."
            />
            <FeatureCard 
              icon={<PackageSearch className="w-10 h-10 text-primary" />}
              title="Dostępność w Magazynie"
              desc="Realizujemy wysyłki tego samego dnia, a autoryzowani instalatorzy zyskują ukryte marże handlowe."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-card border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-primary/10 w-fit p-4 rounded-lg mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function PackageSearch(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
      <path d="M16.5 9.4 7.55 4.24" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
      <circle cx="18.5" cy="15.5" r="2.5" />
      <path d="M20.27 17.27L22 19" />
    </svg>
  )
}
