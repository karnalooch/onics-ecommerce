// src/app/_components/FeatureBento.tsx
"use client";

import { ShieldCheck, Signal, Server, HardHat } from "lucide-react";

export function FeatureBento() {
  return (
    <section className="bg-slate-50/50 py-32 border-t border-slate-100 relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <header className="mb-20 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase italic mb-6">
            Infrastruktura <span className="text-primary italic">Zakupowa</span>
          </h2>
          <p className="text-slate-500 text-lg font-bold max-w-2xl uppercase tracking-tight">
            Zaprojektowana by minimalizować czas obsługi zamówień i maksymalizować marżę Twojej firmy instalacyjnej.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <BentoMain />
          <BentoSmall icon={ShieldCheck} title="Certyfikacja Tech" desc="Urządzenia Grade 2 i Grade 3. Gotowe do inwestycji deweloperskich." />
          <BentoSmall icon={Signal} title="Status Live" desc="Aktualizowane w czasie rzeczywistym stany magazynowe i dostępność." />
          <BentoWide />
        </div>
      </div>
    </section>
  );
}

function BentoMain() {
  return (
    <div className="md:col-span-2 bg-white border-2 border-slate-100 rounded-[3rem] p-12 flex flex-col md:flex-row gap-10 items-center shadow-2xl shadow-slate-200/30 group hover:border-primary/20 transition-all duration-500">
      <div className="bg-primary/10 p-6 rounded-[2rem] shrink-0 group-hover:scale-110 transition-transform">
        <Server className="w-12 h-12 text-primary" />
      </div>
      <div className="text-center md:text-left">
        <h3 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">Automatyzacja KSeF</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed uppercase tracking-tight">
          Platforma bezszwowo współpracuje z polskim systemem KSeF. Poprawna weryfikacja NIP gwarantuje natychmiastowe wystawianie faktur kosztowych i brak opóźnień.
        </p>
      </div>
    </div>
  );
}

function BentoSmall({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col justify-center items-center text-center shadow-xl shadow-slate-200/20 hover:border-primary/20 transition-all group">
      <div className="bg-primary/5 p-5 rounded-2xl mb-8 group-hover:bg-primary group-hover:text-white transition-all">
        <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
      </div>
      <h3 className="text-xl font-black mb-4 uppercase italic tracking-tighter">{title}</h3>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{desc}</p>
    </div>
  );
}

function BentoWide() {
  return (
    <div className="md:col-span-2 bg-slate-900 border-none rounded-[3rem] p-12 flex flex-col md:flex-row gap-12 items-center shadow-2xl shadow-slate-900/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 opacity-50" />
      <div className="flex-1 text-center md:text-left relative z-10">
        <h3 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tight">Łańcuch Dostaw Premium</h3>
        <p className="text-white/50 font-bold text-sm leading-relaxed uppercase tracking-tight">
          Logistyka oparta o najszybszych kurierów. Autoryzowani partnerzy B2B dysponują priorytetowym traktowaniem RMA oraz dedykowanym opiekunem handlowym.
        </p>
      </div>
      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl shrink-0 z-10">
        <HardHat className="w-16 h-16 text-primary" />
      </div>
    </div>
  );
}
