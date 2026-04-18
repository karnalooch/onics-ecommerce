// src/app/_components/HeroSection.tsx
"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.1))]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container relative mx-auto px-6 pt-32 pb-40 md:pt-48 md:pb-60 text-center max-w-6xl">
        <div className="mx-auto flex max-w-fit items-center justify-center space-x-3 overflow-hidden rounded-[2rem] border-2 border-primary/20 bg-primary/5 px-8 py-3 backdrop-blur-md mb-12 shadow-xl shadow-primary/5 transition-all hover:bg-primary/10 hover:scale-105">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary italic">System Dystrybucji B2B 2.1</p>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-[calc(-0.04em)] mb-10 text-slate-900 leading-[0.9]">
          Zaufane Dostawy <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-blue-600 to-indigo-700 italic">
            Technologii SSWiN i CCTV
          </span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-xl md:text-2xl text-slate-500 mb-16 font-bold leading-relaxed">
          Profesjonalna platforma dla instalatorów i integratorów. 
          Gwarancja dostępności, automatyzacja KSeF i ukryte poziomy cenowe B2B.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <Link 
            href="/logowanie" 
            className="w-full sm:w-auto inline-flex justify-center items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-primary transition-all shadow-2xl shadow-slate-900/20 hover:-translate-y-1 active:scale-95"
          >
            <Lock className="w-5 h-5" /> Zaloguj do Terminala
          </Link>
          <Link 
            href="/sklep" 
            className="w-full sm:w-auto inline-flex justify-center items-center gap-4 bg-white border-2 border-slate-100 text-slate-900 px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:border-primary/30 transition-all shadow-xl shadow-slate-200/50 hover:-translate-y-1 active:scale-95 group"
          >
            Otwarty Katalog Detal <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
        </div>

        {/* Dynamic Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
           <div className="w-1 h-12 bg-slate-900 rounded-full" />
        </div>
      </div>
    </section>
  );
}
