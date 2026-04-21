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
          className="flex flex-col gap-10 mb-16 no-blur"
        >
          {/* THE OPERATIONAL DATA HUB */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* TERMINAL 1: TRANSACTIONAL DATA (WF-MAG) */}
            <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none">
               <div className="bg-slate-950 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-primary text-white flex items-center justify-center">
                        <Terminal className="w-5 h-5" />
                     </div>
                     <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">INGESTION_GATEWAY</h3>
                  </div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Node_Alpha</span>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex flex-col gap-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Source: WF-MAG_DATABASE</span>
                     <WfMagUploadButton onParsed={onExcelParsed} />
                  </div>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">
                     Automatyczne mapowanie: SKU / PRICE / STOCK.
                     Bezpośredni transfer do bufora weryfikacji.
                  </div>
               </div>
            </div>

            {/* TERMINAL 2: NEURAL ENGINE (PDF/XLS CATALOGS) */}
            <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none">
               <div className="bg-slate-950 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-primary text-white flex items-center justify-center">
                        <Cpu className="w-5 h-5" />
                     </div>
                     <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">NEURAL_PROCESSOR</h3>
                  </div>
                  {isTraining && <Activity className="w-4 h-4 text-primary animate-pulse" />}
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="flex flex-col gap-4">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Task: Batch_Knowledge_Extraction</span>
                     <div className="relative">
                        <input type="file" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <button className="h-11 w-full bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4 active-press transition-all hover:bg-slate-800">
                           {isUploading ? <RefreshCcw className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                           {isUploading ? "UPLOADING..." : "UPLOAD_CATALOG_DATA"}
                        </button>
                     </div>
                  </div>

                  {isTraining && (
                     <div className="p-6 bg-slate-950 text-white rounded-none">
                        <div className="flex justify-between items-end mb-4">
                           <span className="text-[9px] font-black text-primary uppercase tracking-widest">Processing_Map</span>
                           <span className="text-xl font-black italic tabular-nums">{progressPercent}%</span>
                        </div>
                        <div className="h-1 bg-white/10 w-full overflow-hidden">
                           <motion.div 
                              className="h-full bg-primary" 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                           />
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* TERMINAL 3: KNOWLEDGE VAULT */}
            <div className="satel-card p-0 bg-white border-none overflow-hidden rounded-none">
               <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Library className="w-5 h-5 text-slate-300" />
                     <h3 className="text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] italic">KNOWLEDGE_REPOSITORY</h3>
                  </div>
                  <div className="flex gap-2">
                     <div className="h-6 px-3 bg-slate-950 text-white text-[9px] font-black flex items-center">{sources.length} SOURCES</div>
                     <button onClick={onClearAll} className="w-8 h-6 bg-slate-100 text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center">
                        <Trash2 className="w-3 h-3" />
                     </button>
                  </div>
               </div>
               
               <div className="p-4 space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar">
                  {sources.map((s, idx) => (
                     <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 group transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                           <div className={`p-2 ${s.endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'}`}>
                              {s.endsWith('.pdf') ? <FileText className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                           </div>
                           <span className="text-[9px] font-black text-slate-950 uppercase truncate tracking-tight">{s}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => onTrainSource(s)} className={`h-8 w-8 flex items-center justify-center transition-all ${processedSources.includes(s) ? 'bg-primary text-white' : 'bg-white text-slate-300 hover:text-primary'}`}>
                              <Sparkles className="w-3 h-3" />
                           </button>
                           <button onClick={() => onDeleteSource(s)} className="h-8 w-8 bg-white text-slate-300 hover:text-red-500 flex items-center justify-center">
                              <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                     </div>
                  ))}
                  {sources.length === 0 && (
                     <div className="h-32 flex flex-col items-center justify-center text-slate-200">
                        <Globe className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Repository_Offline</span>
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
