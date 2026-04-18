"use client"

import React from "react"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext"

export function GlobalKnowledgeIndicator() {
  const { isTraining, isDone, trainingFile, setIsMinimized, foundCount } = useKnowledge()

  if (!isTraining) return null

  const isPdf = trainingFile?.toLowerCase().endsWith('.pdf')
  const themeColor = isPdf ? 'red' : 'emerald'

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={!isDone ? { 
        opacity: 1, 
        x: 0,
        boxShadow: [
          "0 0 0px rgba(0, 0, 0, 0)",
          isPdf 
            ? "0 0 25px rgba(239, 68, 68, 0.7)" 
            : "0 0 25px rgba(16, 185, 129, 0.7)",
          "0 0 0px rgba(0, 0, 0, 0)"
        ],
        borderColor: [
          "rgba(203, 213, 225, 0.4)",
          isPdf 
            ? "rgba(239, 68, 68, 0.8)" 
            : "rgba(16, 185, 129, 0.8)",
          "rgba(203, 213, 225, 0.4)"
        ]
      } : { opacity: 1, x: 0 }}
      transition={!isDone ? { 
        boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        borderColor: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        duration: 0.3 
      } : { duration: 0.3 }}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
      onClick={() => setIsMinimized(false)}
      className={`flex items-center gap-2.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-2 ${isDone ? 'border-emerald-500/50' : 'border-transparent'} pr-4 pl-2 py-1.5 rounded-2xl shadow-xl cursor-pointer transition-all group shrink-0`}
    >
      <div className="relative flex items-center justify-center">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center border ${isDone ? 'border-emerald-500/50 bg-emerald-500/10' : `border-${themeColor}-500/20 bg-${themeColor}-500/5`} transition-colors`}>
          <FileText className={`h-4 w-4 ${isDone ? 'text-emerald-500' : `text-${themeColor}-500`}`} />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {isDone ? 'Analiza Gotowa' : 'Inteligentna Analiza'}
        </span>
      </div>
    </motion.div>
  )
}
