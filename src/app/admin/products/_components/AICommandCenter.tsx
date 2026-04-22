// src/app/admin/products/_components/AICommandCenter.tsx
"use client";

import { useState } from "react";
import { 
  Brain, Upload, FileText, FileSpreadsheet, RefreshCcw, 
  Trash2, Sparkles, Database, Library, Activity, Zap, Cpu,
  Box, Terminal, Globe, ChevronRight
} from "lucide-react";
import { WfMagUploadButton } from "./WfMagUploadButton";
import { motion, AnimatePresence } from "framer-motion";

interface IAICommandCenterProps {
  isOpen: boolean;
  onToggle: () => void;
  sources: string[];
  processedSources: string[];
  isUploading: boolean;
  isTraining: boolean;
  progressPercent: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteSource: (filename: string) => void;
  onTrainSource: (filename: string) => void;
  onClearAll: () => void;
  knowledgeCount: number;
  onExcelParsed: (data: any[]) => void;
  categories: any[];
  manufacturers: any[];
  onRefreshStructure: () => void;
}

export function AICommandCenter({ 
  isOpen, onToggle, sources, processedSources, isUploading, 
  isTraining, progressPercent, onUpload, onDeleteSource, 
  onTrainSource, onClearAll, knowledgeCount, onExcelParsed,
  categories, manufacturers, onRefreshStructure
}: IAICommandCenterProps) {

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex flex-col gap-10 mb-16 px-1"
        >
          {/* THE OPERATIONAL DATA HUB */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* TERMINAL 1: TRANSACTIONAL DATA (WF-MAG) */}
            <div className="fluent-card shadow-2xl border-white/10 overflow-hidden">
               <div className="bg-primary/5 px-8 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
                        <Terminal className="w-5 h-5" />
                     </div>
                     <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Baza WF-Mag</h3>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">Node.Alpha</span>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex flex-col gap-3">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Synchronizacja z ERP</span>
                     <WfMagUploadButton onParsed={onExcelParsed} />
                  </div>
                  
                  <div className="p-5 bg-primary/5 rounded-lg text-[11px] font-medium text-muted-foreground leading-relaxed">
                     Automatyczne mapowanie: SKU, ceny oraz stany.
                     Dane trafiają bezpośrednio do bufora weryfikacji.
                  </div>
               </div>
            </div>

            {/* TERMINAL 2: NEURAL ENGINE (PDF/XLS CATALOGS) */}
            <div className="fluent-card shadow-2xl border-white/10 overflow-hidden">
               <div className="bg-primary/5 px-8 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
                        <Cpu className="w-5 h-5" />
                     </div>
                     <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Silnik Analizy PDF</h3>
                  </div>
                  {isTraining && <Activity className="w-4 h-4 text-primary animate-pulse" />}
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex flex-col gap-4">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Ekstrakcja wiedzy z katalogów</span>
                     <div className="relative">
                        <input type="file" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                        <button className="h-11 w-full bg-primary text-white font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-4 rounded-lg active-press transition-all hover:brightness-110 shadow-lg shadow-primary/25">
                           {isUploading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                           {isUploading ? "Przesyłanie..." : "Wgraj Katalog"}
                        </button>
                     </div>
                  </div>

                  {isTraining && (
                     <div className="p-6 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10">
                        <div className="flex justify-between items-end mb-4">
                           <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Przetwarzanie danych</span>
                           <span className="text-2xl font-extrabold italic tabular-nums text-foreground">{progressPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-black/10 dark:bg-white/10 w-full rounded-pill overflow-hidden">
                           <motion.div 
                              className="h-full bg-primary shadow-[0_0_10px_rgba(0,120,212,0.5)]" 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                           />
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* TERMINAL 3: KNOWLEDGE VAULT */}
            <div className="fluent-card shadow-2xl border-white/10 overflow-hidden">
               <div className="bg-primary/5 px-8 py-5 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Library className="w-5 h-5 text-primary" />
                     <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">Repozytorium Wiedzy</h3>
                  </div>
                  <div className="flex gap-2">
                     <div className="h-7 px-4 bg-primary text-white text-[10px] font-bold flex items-center rounded-md shadow-md">{sources.length} ŹRÓDEŁ</div>
                     <button onClick={onClearAll} className="w-8 h-8 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center active-press">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
               
               <div className="p-4 space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar">
                  {sources.map((s, idx) => (
                     <div key={idx} className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg border border-transparent hover:border-black/5 dark:hover:border-white/10 group transition-all">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className={`p-2.5 rounded-lg ${s.endsWith('.pdf') ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                              {s.endsWith('.pdf') ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                           </div>
                           <span className="text-[11px] font-bold text-foreground uppercase truncate tracking-tight">{s}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => onTrainSource(s)} className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all active-press ${processedSources.includes(s) ? 'bg-primary text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-primary'}`}>
                              <Sparkles className="w-4 h-4" />
                           </button>
                           <button onClick={() => onDeleteSource(s)} className="h-9 w-9 bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center rounded-lg transition-all active-press">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                  ))}
                  {sources.length === 0 && (
                     <div className="h-32 flex flex-col items-center justify-center text-muted-foreground/30">
                        <Globe className="w-12 h-12 mb-3 opacity-20" />
                        <span className="text-[11px] font-bold uppercase tracking-widest italic">Repozytorium Puste</span>
                     </div>
                  )}
               </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
