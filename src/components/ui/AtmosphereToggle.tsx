"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Database, Terminal } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function AtmosphereToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-48 h-12 bg-slate-100 animate-pulse" />;

  const isDark = theme === "dark";

  return (
    <div className="relative group select-none">
      
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative w-64 h-12 bg-white border-2 border-slate-950 p-1 flex items-center cursor-pointer transition-all active-press overflow-hidden shadow-xl shadow-slate-900/5"
      >
        {/* SLIDING MECHANICAL CORE */}
        <motion.div
           layout
           transition={{ type: "spring", stiffness: 400, damping: 40 }}
           className={`absolute h-9 w-28 flex items-center justify-center z-10 border-2 transition-all ${
             isDark ? 'bg-slate-950 border-primary left-[calc(100%-7.25rem)]' : 'bg-slate-950 border-slate-900 left-1'
           }`}
        >
           <AnimatePresence mode="wait">
             {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                   <Moon className="w-3.5 h-3.5 text-primary" />
                   <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Obsidian</span>
                </motion.div>
             ) : (
                <motion.div
                  key="sun"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2"
                >
                   <Sun className="w-3.5 h-3.5 text-primary" />
                   <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Solar</span>
                </motion.div>
             )}
           </AnimatePresence>
        </motion.div>

        {/* STATUS LABELS */}
        <div className="flex-1 flex justify-between px-6 z-0">
           <div className={`flex items-center gap-2 transition-opacity duration-500 ${isDark ? 'opacity-20' : 'opacity-100'}`}>
              <Terminal className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-950 italic">Core_Light</span>
           </div>
           
           <div className={`flex items-center gap-2 transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-20'}`}>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-950 italic">Night_Grid</span>
              <Database className="w-3 h-3 text-slate-400" />
           </div>
        </div>

        {/* MECHANICAL INDICATOR FX */}
        <div className={`absolute bottom-0 left-0 h-0.5 bg-primary transition-all ${isDark ? 'w-full' : 'w-0'}`} />
      </button>

   </div>
  );
}
