"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Brain, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCcw, 
  ShieldCheck, 
  Cog, 
  FileSpreadsheet,
  XCircle,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext"

export function GlobalTrainingModal() {
  const { 
    isTraining, 
    isDone, 
    isMinimized, 
    trainingFile, 
    foundCount, 
    logs, 
    progressPercent, 
    analysisStats,
    tempApiKey,
    isValidatingKey,
    validationResult,
    selectedModelId,
    isApproved,
    setSelectedModelId,
    setIsApproved,
    setTempApiKey,
    setValidationResult,
    setIsValidatingKey,
    setIsMinimized,
    setTrainingFile,
    stopTraining,
    resetState,
    startTraining
  } = useKnowledge()

  const handleValidateKey = async () => {
    if (!tempApiKey) return
    
    setIsValidatingKey(true)
    setValidationResult(null)
    try {
      const isPDF = trainingFile?.toLowerCase().endsWith('.pdf')
      const res = await fetch('/api/knowledge/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tempApiKey, isPDF })
      })
      const data = await res.json()
      if (res.ok) {
        setValidationResult({
          success: true,
          recommended: data.recommended,
          cheapestId: data.cheapestId,
          availableModels: data.availableModels || [],
          message: data.message
        })
        setSelectedModelId(data.recommended)
      } else {
        setValidationResult({
          success: false,
          recommended: "",
          availableModels: [],
          message: data.error || "Błąd walidacji"
        })
      }
    } catch (e) {
      setValidationResult({
        success: false,
        recommended: "",
        availableModels: [],
        message: "Wystąpił błąd połączenia z serwerem walidacji"
      })
    } finally {
      setIsValidatingKey(false)
    }
  }

  const handleStartAnalysis = () => {
    if (!trainingFile || !tempApiKey || !selectedModelId || !validationResult?.success) return
    setIsApproved(true)
    startTraining(
      trainingFile, 
      tempApiKey, 
      selectedModelId, 
      validationResult.availableModels
    )
  }

  return (
    <Dialog open={!!trainingFile && !isMinimized} onOpenChange={(open) => {
      if (!open) {
        if (isTraining && !isDone) {
          setIsMinimized(true);
        } else {
          resetState();
        }
      }
    }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-y-auto max-h-[95vh] border-0 bg-transparent shadow-2xl scrollbar-thin [&>button]:hidden">
        <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-xl shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] relative">
          
          {/* Header Window Controls (Unified Minimize) */}
          <div className="absolute right-4 top-4 z-[60]">
            {(isTraining && !isDone) || (!isTraining && !isDone && !trainingFile) ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" 
                onClick={(e) => {
                  e.preventDefault();
                  if (isTraining) setIsMinimized(true);
                  else setTrainingFile(null);
                }}
                title={isTraining ? "Minimalizuj" : "Zamknij"}
              >
                <div className="w-3 h-[1.5px] bg-slate-500 dark:bg-slate-400" />
              </Button>
            ) : (
                <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all" 
                onClick={() => setTrainingFile(null)}
              >
                <RefreshCcw className="h-4 w-4 rotate-45" /> 
              </Button>
            )}
          </div>

          {/* Header Section with Gradient */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <DialogHeader className="flex flex-row items-start justify-between relative z-10">
              <div className="space-y-1.5 text-left">
                <DialogTitle className="flex items-center gap-3 text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
                    <Brain className="h-6 w-6" />
                  </div>
                  Inteligentna Analiza
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Przygotowanie ekstrakcji danych technicznych z pliku:
                  <span className="block mt-1 text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-md inline-block border border-slate-200 dark:border-slate-700">{trainingFile}</span>
                </DialogDescription>
                {isDone && <span className="block mt-2 text-green-600 dark:text-green-400 font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Sukces: Zakończono analizę.</span>}
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            {!isTraining && !isDone && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    {trainingFile?.toLowerCase().endsWith('.pdf') ? <FileText className="h-6 w-6 text-blue-500" /> : <FileSpreadsheet className="h-6 w-6 text-emerald-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{trainingFile}</h3>
                    <p className="text-xs text-muted-foreground">Katalog gotowy do ekstrakcji wiedzy</p>
                  </div>
                </div>

                {/* API Key Section */}
                <div className="space-y-3 p-1">
                  <Label className="text-[11px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 ml-1">Klucz Autoryzacyjny Gemini</Label>
                  <div className="relative group">
                    <Input 
                      type="password"
                      placeholder="Wklej token API (np. AIzaSy...)"
                      value={tempApiKey}
                      onChange={(e) => {
                        setTempApiKey(e.target.value)
                        setValidationResult(null)
                      }}
                      className="bg-white dark:bg-slate-900/50 h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all px-4 shadow-sm"
                    />
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      {tempApiKey && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setTempApiKey(""); setValidationResult(null); }}
                          className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="h-9 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                        onClick={handleValidateKey}
                        disabled={!tempApiKey || isValidatingKey}
                      >
                        {isValidatingKey ? <RefreshCcw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
                        Sprawdź
                      </Button>
                    </div>
                  </div>

                  {validationResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                      className="space-y-4"
                    >
                      <div className={`p-4 rounded-xl border text-xs font-medium shadow-sm flex gap-3 ${
                        validationResult.success 
                        ? "bg-green-50/80 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900/50 dark:text-green-400" 
                        : "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400"
                      }`}>
                        <div className="mt-0.5">
                          {validationResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-[13px]">{validationResult.success ? "Połączenie Gwarantowane" : "Odrzucono Dostęp"}</p>
                          <p className="opacity-90 leading-relaxed">{validationResult.message}</p>
                        </div>
                      </div>

                      {validationResult.success && (
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Wybierz Modela & Koszt</Label>
                           <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                              {validationResult.availableModels.map((model: any) => (
                                <div 
                                  key={model.id}
                                  onClick={() => setSelectedModelId(model.id)}
                                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    selectedModelId === model.id 
                                    ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/10' 
                                    : 'bg-white border-slate-100 hover:border-slate-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                     <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-black text-[11px] tracking-tight text-slate-800">{model.name}</span>
                                          {model.id === validationResult.recommended && (
                                            <Badge className="bg-blue-600 text-[8px] h-4 font-black italic shadow-lg shadow-blue-500/20">REKOMENDOWANY</Badge>
                                          )}
                                          {model.id === validationResult.cheapestId && model.id !== validationResult.recommended && (
                                            <Badge className="bg-emerald-500 text-[8px] h-4 font-black italic shadow-lg shadow-emerald-500/20">NAJTANSZY</Badge>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Input: ${model.inputPrice} / Output: ${model.outputPrice} <span className="text-[8px] lowercase">(per 1M tokens)</span></p>
                                     </div>
                                     {selectedModelId === model.id && (
                                       <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                                          <CheckCircle2 className="w-3 h-3 text-white" />
                                       </div>
                                     )}
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl font-bold border-slate-200 dark:border-slate-800"
                    onClick={() => setTrainingFile(null)}
                  >
                    Anuluj
                  </Button>
                  <Button 
                    className="flex-2 h-12 rounded-xl font-black uppercase tracking-tight px-8 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                    disabled={!validationResult?.success}
                    onClick={handleStartAnalysis}
                  >
                    Inteligentna Analiza
                  </Button>
                </div>
              </div>
            )}

            {(isTraining || isDone) && (
              <div className="py-8 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
                <AnimatePresence mode="wait">
                  {!isDone ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex flex-col items-center space-y-10"
                    >
                      {/* Cog animation */}
                      <div className="relative">
                         <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="relative z-10"
                        >
                          <Cog className="h-32 w-32 text-blue-600 dark:text-blue-500 drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
                        </motion.div>
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-blue-500 blur-3xl rounded-full"
                        />
                      </div>

                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-center space-y-3"
                      >
                        <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-800 dark:text-slate-100">
                          Analizowanie Danych
                        </h2>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
                          Analizuję za pomocą: <span className="text-slate-800 dark:text-white underline decoration-blue-500/50">{selectedModelId || analysisStats?.model || 'Gemini 1.5 Flash'}</span>
                        </p>
                      </motion.div>

                      {/* Stop Button Integrated here for minimalists */}
                      <Button 
                        variant="secondary" 
                        size="lg" 
                        onClick={stopTraining}
                        className="group h-12 px-8 rounded-2xl bg-slate-100 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/20 text-slate-600 hover:text-red-600 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/50 font-bold transition-all shadow-sm hover:shadow-md hover:scale-[1.02]"
                      >
                        <XCircle className="h-4 w-4 mr-2.5 group-hover:rotate-90 transition-transform duration-300" />
                        Przerwij Proces Analizy
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="flex flex-col items-center space-y-6 text-center w-full"
                    >
                      <div className="p-4 bg-emerald-500/10 rounded-full border-4 border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                          Import Zakończony!
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                          Hub Wiedzy został pomyślnie zaktualizowany o nowe dane.
                        </p>
                      </div>

                      <div className="px-10 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                         <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">PRZEANALIZOWANO</p>
                         <p className="text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight group-hover:scale-105 transition-transform duration-500">
                           {foundCount}
                         </p>
                         <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Nowych pozycji w katalogu</p>
                      </div>

                      {analysisStats && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="w-full max-w-[280px] p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2.5"
                        >
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 font-bold uppercase">Model AI</span>
                            <span className="text-blue-600 dark:text-blue-400 font-black tracking-tight">{analysisStats.model || 'Gemini 1.5 Flash'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-500 font-bold uppercase">Wolumen Analizy</span>
                            <span className="text-slate-700 dark:text-slate-200 font-black tracking-tight">{analysisStats.requests} zapytań</span>
                          </div>
                          <div className="h-px bg-slate-200 dark:bg-slate-800" />
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Szacowany Koszt</span>
                            <span className="text-[11px] font-black text-slate-900 dark:text-white">
                              ~{(Math.max(0.3, analysisStats.requests * 0.05)).toFixed(2)} PLN
                            </span>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-[11px] text-muted-foreground italic max-w-[300px]">
                        Produkty są teraz dostępne dla Al-Generatoma opisów oraz w wyszukiwarce ofert.
                      </p>

                      <Button 
                        onClick={resetState}
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tight shadow-xl shadow-emerald-500/20"
                      >
                        Zamknij i Gotowe
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
