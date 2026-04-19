// src/app/admin/products/_components/AICommandCenter.tsx
"use client";

import { useState } from "react";
import { 
  Brain, Upload, FileText, FileSpreadsheet, RefreshCcw, 
  Trash2, Sparkles, Database, Library, Activity, Zap, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WfMagUploadButton } from "./WfMagUploadButton";
import { StructureManager } from "../../catalog/_components/StructureManager";
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
          initial={{ opacity: 0, scale: 0.98, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -20 }}
          transition={{ duration: 0.6, ease: "circOut" }}
          className="space-y-10 mb-16"
        >
          {/* THE NEURAL BRIDGE PORTAL */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* MODULE 1: INGESTION GATEWAY */}
            <div className="relative p-1 bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-[3.5rem] group">
               <div className="h-full p-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.2rem] border border-white dark:border-slate-800 shadow-2xl transition-all hover:bg-white/50">
                  <div className="flex flex-col h-full gap-8">
                     <div className="flex items-center gap-6">
                        <div className="relative">
                           <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse" />
                           <div className="relative p-5 bg-slate-900 text-white rounded-[1.5rem] shadow-2xl shadow-primary/20">
                              <Database className="w-8 h-8" />
                           </div>
                        </div>
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Phase: Data Ingestion</span>
                           <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Gateway <span className="text-primary italic">Lokal</span></h3>
                        </div>
                     </div>

                     <div className="space-y-4 flex-1 mt-4">
                        <div className="p-1 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full w-fit border border-emerald-500/20 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                           <span className="text-[9px] font-black uppercase tracking-widest leading-none">Status: Ready to Stream</span>
                        </div>
                        
                        <div className="relative w-full h-20 bg-white dark:bg-slate-800 rounded-[1.8rem] border-2 border-slate-100 dark:border-slate-700 hover:border-primary transition-all cursor-pointer group/upload overflow-hidden shadow-sm flex items-center justify-center gap-4">
                           <WfMagUploadButton onParsed={onExcelParsed} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full" />
                           <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-2xl group-hover/upload:scale-110 transition-transform">
                              <FileSpreadsheet className="w-6 h-6" />
                           </div>
                           <div className="flex flex-col">
                              <span className="text-sm font-black uppercase tracking-tighter dark:text-white">Wgraj Arkusz XLS</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">WF-MAG V9 COMPATIBLE</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 italic text-[10px] text-slate-400 leading-relaxed font-bold">
                       System automatycznie zmapuje kolumny SKU, Ceny i Stany. Dane trafią bezpośrednio do Weryfikacji.
                     </div>
                  </div>
               </div>
            </div>

            {/* MODULE 2: NEURAL SIEVE V12 CORE */}
            <div className="relative p-1 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent rounded-[3.5rem] group">
               <div className="h-full p-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.2rem] border border-white dark:border-slate-800 shadow-2xl transition-all hover:bg-white/50">
                  <div className="flex flex-col h-full gap-8">
                     <div className="flex items-center gap-6">
                        <div className="relative">
                           <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${isTraining ? 'bg-orange-500/30' : 'bg-blue-500/30'}`} />
                           <div className={`relative p-5 text-white rounded-[1.5rem] shadow-2xl transition-all ${isTraining ? 'bg-orange-500 rotate-12' : 'bg-blue-600'}`}>
                              {isTraining ? <RefreshCcw className="w-8 h-8 animate-spin" /> : <Cpu className="w-8 h-8" />}
                           </div>
                        </div>
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Engine: Neural Sieve V12</span>
                           <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Analizator <span className="text-blue-600 dark:text-blue-400 italic">AI</span></h3>
                        </div>
                     </div>

                     <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-500" />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Heurystyka Aktywna</span>
                           </div>
                           <div className="relative overflow-hidden">
                              <input type="file" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                              <Button className="h-14 px-8 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all font-black uppercase text-[10px] tracking-widest gap-3">
                                 {isUploading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Upload className="w-5 h-5" />}
                                 {isUploading ? "Przesyłanie..." : "Wgraj Katalog"}
                              </Button>
                           </div>
                        </div>

                        {isTraining && (
                           <motion.div 
                             initial={{ opacity: 0, y: 10 }} 
                             animate={{ opacity: 1, y: 0 }}
                             className="p-6 bg-slate-900 rounded-[2rem] space-y-4 shadow-2xl"
                           >
                              <div className="flex justify-between items-end">
                                 <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.4em] mb-1">Processing Neural Map</span>
                                    <span className="text-2xl font-black italic text-white tracking-tighter tabular-nums">{progressPercent}%</span>
                                 </div>
                                 <Zap className="w-6 h-6 text-orange-500 fill-orange-500 animate-bounce" />
                              </div>
                              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 group-hover:border-white/20 transition-all">
                                 <motion.div 
                                   className="h-full bg-gradient-to-r from-orange-600 to-amber-400 relative" 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${progressPercent}%` }}
                                   transition={{ duration: 0.5 }}
                                 >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                 </motion.div>
                              </div>
                           </motion.div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* MODULE 3: KNOWLEDGE REPOSITORY */}
            <div className="relative p-1 bg-gradient-to-br from-slate-200/20 via-transparent to-transparent rounded-[3.5rem] group h-full">
               <div className="h-full p-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.2rem] border border-white dark:border-slate-800 shadow-2xl transition-all flex flex-col h-full gap-8">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl group-hover:bg-primary transition-all group-hover:text-white group-hover:rotate-6">
                           <Library className="w-6 h-6" />
                        </div>
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Library Index</span>
                           <h4 className="text-xl font-black uppercase italic tracking-tighter dark:text-white leading-none">Neural Repository</h4>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <Badge className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none font-black text-[10px] tracking-widest px-3 py-1 rounded-full">{sources.length} SOURCES</Badge>
                        <Button variant="ghost" size="icon" onClick={onClearAll} className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90">
                           <Trash2 className="w-5 h-5" />
                        </Button>
                     </div>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                     <AnimatePresence>
                        {sources.map((s, idx) => (
                           <motion.div 
                             key={s} 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: idx * 0.05 }}
                             className="flex items-center justify-between p-5 bg-white/60 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] hover:shadow-xl hover:-translate-y-1 transition-all group/item"
                           >
                              <div className="flex items-center gap-4 overflow-hidden">
                                 <div className={`p-3 rounded-xl ${s.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    {s.endsWith('.pdf') ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                                 </div>
                                 <div className="flex flex-col truncate">
                                    <span className="text-xs font-black uppercase tracking-tighter truncate dark:text-slate-100">{s}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Source Authenticated</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all scale-90 group-hover/item:scale-100">
                                 <Button 
                                   variant="ghost" size="icon" onClick={() => onTrainSource(s)} 
                                   className={`h-10 w-10 rounded-xl transition-all ${processedSources.includes(s) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`}
                                 >
                                    <Sparkles className={`w-5 h-5 ${processedSources.includes(s) && 'animate-pulse'}`} />
                                 </Button>
                                 <Button variant="ghost" size="icon" onClick={() => onDeleteSource(s)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                                    <Trash2 className="w-5 h-5" />
                                 </Button>
                              </div>
                           </motion.div>
                        ))}
                     </AnimatePresence>
                     {sources.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-slate-400 p-10 opacity-60">
                           <Library className="w-16 h-16 mb-4 animate-pulse" />
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] italic mt-2">Repository Empty</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* LOWER SECTION: KNOWLEDGE STRUCTURE (BENTO EXPANSION) */}
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
             <StructureManager 
                categories={categories}
                manufacturers={manufacturers}
                onRefresh={onRefreshStructure}
             />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
