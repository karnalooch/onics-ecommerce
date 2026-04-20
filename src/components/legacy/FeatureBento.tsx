// src/app/_components/FeatureBento.tsx
"use client";

import { ShieldCheck, Video, Settings, Building2, HardHat, ShieldAlert, Cpu, Workflow } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "SSWiN & Alarmy",
    desc: "Projektowanie i montaż systemów sygnalizacji włamania. Autoryzowany dystrybutor Satel, DSC i Siemens. Bezpieczeństwo bez kompromisów.",
    icon: ShieldAlert,
    wide: true,
    badge: "Grade 3 Standard"
  },
  {
    title: "Monitoring CCTV",
    desc: "Cyfrowe systemy nadzoru wideo IP. Precyzyjna analityka obrazu i zdalny dostęp 24/7.",
    icon: Video,
    wide: false,
    badge: "VCA AI"
  },
  {
    title: "Serwis 24/7",
    desc: "Własny, całodobowy serwis techniczny w Siedlcach. Błyskawiczna reakcja i wsparcie.",
    icon: Settings,
    wide: false,
    badge: "Live Support"
  },
  {
    title: "Automatyka & PPOŻ",
    desc: "Systemy przeciwpożarowe Polon oraz inteligentna automatyka bram Came i Nice.",
    icon: Building2,
    wide: true,
    badge: "Industrial"
  }
];

export function FeatureBento() {
  return (
    <section className="bg-[#FDFCFB] dark:bg-[#050505] py-24 relative overflow-hidden transition-colors duration-1000">
      {/* V12 AMBIENT GLOW */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[180px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 max-w-[2000px] relative z-10">
        <header className="mb-16 flex flex-col lg:flex-row items-end justify-between gap-8 text-right lg:text-left">
           <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-4 animate-in slide-in-from-left-4 duration-700">
                <div className="h-[2px] w-12 bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-primary italic">Operational Infrastructure</span>
              </div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-[0.85]">
                Technologie <br className="hidden md:block" />
                <span className="text-primary italic">Bezpieczeństwa</span>
              </h2>
           </div>
           <p className="text-slate-400 text-[10px] font-black max-w-xl uppercase tracking-[0.2em] leading-loose italic">
             Kompleksowe rozwiązania dla biznesu i domu. Od projektowania po serwis 24/7 – zapewniamy pełną ochronę Twojego mienia od 1993 roku. [Panoramic Center]
           </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <BentoCard key={i} icon={f.icon} title={f.title} desc={f.desc} badge={f.badge} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCard({ icon: Icon, title, desc, badge }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-10 flex flex-col text-center lg:text-left group hover:bg-slate-900 dark:hover:bg-white transition-all duration-500"
    >
      <div className="relative mb-8 flex justify-center lg:justify-start">
        <div className="p-5 bg-primary/5 rounded-xl group-hover:bg-primary transition-all duration-500 relative z-10">
           <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
        </div>
      </div>
      
      <div className="mb-4">
        <span className="text-[7px] font-black uppercase tracking-[0.4em] px-3 py-1 bg-primary/10 text-primary rounded-full group-hover:bg-white/20 group-hover:text-white dark:group-hover:text-slate-900">{badge}</span>
      </div>
      
      <h3 className="text-xl font-black mb-4 uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-950 transition-colors">{title}</h3>
      
      <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] leading-relaxed italic group-hover:text-slate-300 dark:group-hover:text-slate-500 transition-colors">{desc}</p>
    </motion.div>
  );
}
