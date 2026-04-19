// src/app/admin/products/_components/HardwareCard3D.tsx
"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Brain, Zap, Package, Folder, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import gsap from "gsap";

interface IHardwareCard3DProps {
  p: any;
  categoryName?: string;
  subcategoryName?: string;
}

export function HardwareCard3D({ p, categoryName, subcategoryName }: IHardwareCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const isVirtual = p.isVirtual;
  const hasIqMatch = p.isIqSynced || isVirtual;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      const rotateX = (centerY - y) / 10;
      const rotateY = (x - centerX) / 10;

      gsap.to(card, {
        rotateX,
        rotateY,
        duration: 0.5,
        ease: "power2.out",
        transformPerspective: 1000,
      });

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          x,
          y,
          opacity: 1,
          duration: 0.5,
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 1,
        ease: "elastic.out(1, 0.3)",
      });
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0,
          duration: 1,
        });
      }
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="perspective-1000">
      <div 
        ref={cardRef}
        className={`group relative p-8 glass-card rounded-[3rem] transition-all duration-700 isolate overflow-hidden preserve-3d ${
          isVirtual ? 'border-primary/40' : 'border-white/20'
        }`}
      >
        {/* DYNAMIC GLOW EFFECT */}
        <div 
          ref={glowRef}
          className="absolute -inset-px transition-opacity pointer-events-none -z-10 opacity-0"
          style={{
             background: `radial-gradient(600px circle at var(--x) var(--y), ${isVirtual ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.15)'}, transparent 40%)`
          }}
        />

        <div className="flex flex-col gap-8 h-full">
          {/* HEADER: MANUFACTURER & BADGE */}
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">
                {p.manufacturer || "Secteur Inconnu"}
             </span>
             {hasIqMatch && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-ks-sm">
                   <Zap className="w-4 h-4 fill-primary" />
                </div>
             )}
          </div>

          {/* MAIN CONTENT: ICON & NAME */}
          <div className="flex-1 space-y-4">
             <div className="w-16 h-16 rounded-[2rem] bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-950 shadow-ks-md group-hover:scale-110 transition-transform duration-500">
                {isVirtual ? <Brain className="w-8 h-8" /> : <Package className="w-8 h-8" />}
             </div>
             
             <div className="space-y-2">
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none italic group-hover:text-primary transition-colors">
                   {p.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50">
                    {p.sku}
                  </span>
                </div>
             </div>
          </div>

          {/* FOOTER: PRICE & CATEGORY */}
          <div className="pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-4">
             <div className="flex items-end justify-between">
                <div className="flex flex-col">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {categoryName || "Katalog Global"}
                   </span>
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Verifié V12</span>
                   </div>
                </div>
                
                <div className="text-right">
                   <div className="text-3xl font-black italic tracking-tighter leading-none">
                      {p.price?.toFixed(2)}
                      <span className="text-sm ml-1 not-italic">PLN</span>
                   </div>
                </div>
             </div>

             {/* ZEN ACTION OVERLAY */}
             <div className="absolute inset-x-8 bottom-8 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 flex gap-2">
                <button 
                  aria-label={`Edit ${p.name}`}
                  className="flex-1 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-ks-lg hover:bg-primary dark:hover:bg-primary transition-colors"
                >
                   Edit Node
                </button>
                <button 
                  aria-label={`Run Neural AI Analysis for ${p.name}`}
                  className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                >
                   <Brain className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
