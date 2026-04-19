// src/app/admin/catalog/_components/CommandPalette.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Package, ShieldCheck, LayoutGrid, Brain, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("open-command-palette", handleOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("open-command-palette", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        {/* BACKDROP */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        />

        {/* PALETTE BOX */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-ks-lg border border-white dark:border-slate-800 overflow-hidden"
        >
          <div className="flex items-center px-8 h-20 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-6 h-6 text-primary mr-4" />
            <input 
              autoFocus
              aria-label="Search Celtronics V12 Database"
              placeholder="Search Celtronics V12 Database (CCTV, SWN, ACC)..."
              className="flex-1 bg-transparent border-none outline-none text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white placeholder:text-slate-300"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-400">ESC</div>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
             <div className="px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Quick Actions</span>
             </div>
             
             <div className="space-y-1">
                <PaletteItem icon={<Package />} label="Jump to Central Registry" shortcut="G C" />
                <PaletteItem icon={<ShieldCheck />} label="View Verification Desk" shortcut="G V" />
                <PaletteItem icon={<LayoutGrid />} label="Manage Infrastructure" shortcut="G S" />
                <PaletteItem icon={<Brain />} label="Analyze with Neural AI" shortcut="G A" />
             </div>

             {query && (
               <div className="mt-8 px-4 py-10 text-center border-t border-dashed border-slate-100 dark:border-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full w-fit mx-auto mb-4">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                    Searching for <span className="text-primary">"{query}"</span> across Global Celtronics Clusters...
                  </p>
               </div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function PaletteItem({ icon, label, shortcut }: any) {
  return (
    <button 
      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-all group outline-none focus:bg-primary/5 focus:ring-2 focus:ring-primary/20"
      onClick={() => console.log(`Executing ${label}`)}
    >
       <div className="flex items-center gap-4">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-primary/10 group-focus:text-primary rounded-xl transition-all">
            {icon}
          </div>
          <span className="text-sm font-black uppercase tracking-tight text-slate-700 dark:text-slate-200 group-focus:text-primary">{label}</span>
       </div>
       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{shortcut}</span>
    </button>
  );
}
