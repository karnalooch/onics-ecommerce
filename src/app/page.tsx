// src/app/page.tsx
import { HeroSection } from "./_components/HeroSection";
import { FeatureBento } from "./_components/FeatureBento";

/**
 * Main Landing Page (Server Component)
 * Premium unified aesthetic + RSC Performance.
 * Redesigned to wow users with high-fidelity typography and modular atomic structure.
 */
export default async function Home() {
  return (
    <main className="flex flex-col">
       <HeroSection />
       <FeatureBento />
       
       {/* Future: Integration with dynamic blog/news if needed */}
       <footer className="py-20 bg-white border-t border-slate-50">
          <div className="container mx-auto px-6 text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">
               © 2026 Celtronics Distribution . Terminal B2B All Rights Reserved
             </p>
          </div>
       </footer>
    </main>
  );
}
