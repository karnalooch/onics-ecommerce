"use client";

import { Award, ShieldCheck, Sparkles } from "lucide-react";

interface InstallerTierProps {
  currentLevel: string;
  discount: number;
}

export function InstallerTier({ currentLevel, discount }: InstallerTierProps) {
  return (
    <div className="bg-card backdrop-blur-xl rounded-3xl p-8 border border-border shadow-xl shadow-primary/5 relative overflow-hidden group min-h-[280px] flex flex-col justify-between transition-all duration-700">
      {/* Decorative background gradients - strictly blue/gray */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-muted rounded-full blur-3xl opacity-50 group-hover:bg-primary/5 transition-colors duration-700" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary rounded-lg shadow-lg shadow-primary/30">
                <Award className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Partner Celtronics</span>
            </div>
            <h2 className="text-4xl font-black text-foreground tracking-tight uppercase leading-none italic">
              Level: <span className="text-primary">{currentLevel}</span>
            </h2>
          </div>
          
          <div className="relative group/badge">
             <div className="absolute inset-0 bg-primary blur-lg opacity-10 group-hover/badge:opacity-20 transition-opacity" />
             <div className="relative bg-primary/5 border border-primary/20 px-5 py-3 rounded-2xl flex flex-col items-center">
               <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Rabat</span>
               <span className="text-3xl font-black text-primary">-{discount}%</span>
             </div>
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-primary" />
             </div>
             <div>
                <p className="text-xs font-black text-foreground uppercase tracking-tighter">Status: Autoryzowany</p>
                <p className="text-[10px] text-muted-foreground font-medium">Masz pełny dostęp do cen hurtowych B2B</p>
             </div>
          </div>

          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-2xl shadow-lg shadow-primary/20">
             <Sparkles className="w-4 h-4 text-white" />
             <span className="text-[10px] font-black uppercase tracking-widest">Twoje warunki są przydzielane indywidualnie</span>
          </div>
        </div>
      </div>
    </div>
  );
}
