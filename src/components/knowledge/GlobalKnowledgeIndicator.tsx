"use client"

import React from "react"
import { motion } from "framer-motion"
import { FileText, Database, Activity, ShieldCheck } from "lucide-react"
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext"

export function GlobalKnowledgeIndicator() {
  const { isTraining, isDone, trainingFile, setIsMinimized, foundCount } = useKnowledge()

  if (!isTraining) return null

  const isPdf = trainingFile?.toLowerCase().endsWith('.pdf')

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ backgroundColor: "rgba(248, 250, 252, 1)" }}
      onClick={() => setIsMinimized(false)}
      className={`flex items-center gap-4 bg-white border-2 px-6 py-2 select-none cursor-pointer transition-all active-press h-14 ${
        isDone ? 'border-status-success shadow-lg shadow-status-success/5' : 'border-slate-950 shadow-xl'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className={`w-10 h-10 flex items-center justify-center border-2 transition-colors ${
          isDone ? 'border-status-success bg-status-success/5 text-status-success' : 'border-slate-950 bg-slate-950 text-white'
        }`}>
          <FileText className="w-5 h-5" />
          {!isDone && (
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary animate-ping" />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-950 italic leading-none">
             {isDone ? 'REJESTR_GOTOWY' : 'PROCESOR_AI_AKTYWNY'}
           </span>
           {isDone ? (
              <ShieldCheck className="w-3 h-3 text-status-success" />
           ) : (
              <Activity className="w-3 h-3 text-primary animate-pulse" />
           )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
           <Database className="w-2.5 h-2.5 text-slate-300" />
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px] italic leading-none">
              Node_Stream: {trainingFile || "PIM_QUEUE"}
           </span>
        </div>
      </div>
    </motion.div>
  )
}
