// src/app/_components/HeroSection.tsx
"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { PartnersCarousel } from "./PartnersCarousel";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-screen lg:h-screen overflow-hidden bg-[#FDFCFB] dark:bg-[#050505] flex flex-col group" suppressHydrationWarning>
      {/* V12 NEURAL MESH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-grid-slate-900/[0.02] dark:bg-grid-white/[0.02]" />
      </div>
      
      <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 px-8 lg:px-24 z-10 py-20 lg:py-0">
        
        {/* LEFT HUB: BRAND & HERITAGE */}
        <div className="flex-1 w-full text-center lg:text-left space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center lg:justify-start space-x-4 glass-card px-8 py-3 w-fit mx-auto lg:mx-0 shadow-ks-md"
          >
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute inset-0" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary relative z-10 shadow-[0_0_15px_oklch(var(--color-primary))]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary italic">Protocol: V12 Neural Command Dashboard</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="h-[2px] w-12 bg-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary italic">Est. 1993 • Siedlce Headquarters</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black tracking-tighter uppercase italic leading-[0.8] text-slate-900 dark:text-white transition-colors duration-500">
              Wszystko dla <br/>
              <span className="text-primary relative inline-block">
                Twojego
                <div className="absolute -bottom-4 left-0 w-full h-8 bg-primary/10 -skew-x-12 -z-10" />
              </span> <br className="hidden xl:block"/> 
              Bezpieczeństwa
            </h1>
          </motion.div>
        </div>

        {/* RIGHT HUB: MISSION & CTAs */}
        <div className="w-full lg:w-[35%] space-y-12">
          <motion.p 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center lg:text-left text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-slate-400 leading-loose"
          >
            Ponad <span className="text-slate-900 dark:text-white underline decoration-primary decoration-4 underline-offset-4">30 lat doświadczenia</span> w projektowaniu i wdrażaniu zaawansowanych systemów zabezpieczeń, CCTV oraz automatyki. Profesjonalny montaż i serwis 24/7.
          </motion.p>
          
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-6">
            <Link 
              href="/logowanie" 
              className="w-full h-20 px-12 glass-card bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-6 font-black uppercase tracking-[0.4em] text-[10px] hover:bg-primary dark:hover:bg-primary transition-all shadow-ks-lg hover:-translate-y-2 active:scale-95 group"
            >
              <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" /> Autoryzacja Terminala
            </Link>
            <Link 
              href="/sklep" 
              className="w-full h-20 px-10 glass-card rounded-2xl flex items-center justify-center gap-6 font-black uppercase tracking-[0.4em] text-[10px] text-slate-400 hover:text-primary transition-all hover:-translate-y-2 active:scale-95 group"
            >
              Katalog Publiczny <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* EMBEDDED PANORAMIC CAROUSEL (First Viewport) */}
      <div className="relative z-10 w-full mb-12 transform scale-90 lg:scale-100 origin-bottom">
         <PartnersCarousel />
      </div>
    </section>
  );
}
