"use client";

import { motion } from "framer-motion";

const brands = [
  "Satel", "Novus", "Came", "Nice", "Roger", "Polon-Alfa", "Hikvision", "Dahua", "Siemens", "Bosch", "Panasonic", "DSC"
];

export function PartnersCarousel() {
  return (
    <section className="py-20 bg-[#FDFCFB] dark:bg-[#050505] overflow-hidden border-y border-slate-100 dark:border-slate-900 transition-colors duration-1000">
      <div className="container mx-auto px-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="h-[1px] w-8 bg-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Autoryzowana Dystrybucja & Partnerstwo</span>
        </div>
      </div>

      <div className="relative flex overflow-hidden">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap gap-20 py-4"
        >
          {[...brands, ...brands].map((brand, i) => (
            <div key={i} className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-200 dark:text-slate-800 hover:text-primary dark:hover:text-primary transition-colors cursor-default select-none">
              {brand}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
