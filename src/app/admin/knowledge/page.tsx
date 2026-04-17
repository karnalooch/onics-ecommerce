"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Brain, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCcw,
  BookOpen,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface KnowledgeSnippet {
  id: string
  source: string
  model: string
  specs: string
  type: 'pdf' | 'xls'
  date: string
  price?: number | null
  currency?: string
}

export default function KnowledgePage() {
  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [processedSources, setProcessedSources] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isTraining, setIsTraining] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  
  // State for Training Modal
  const [trainingFile, setTrainingFile] = useState<string | null>(null)
  const [tempApiKey, setTempApiKey] = useState("")
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean,
    recommended: string,
    availableModels: string[],
    message: string
  } | null>(null)
  
  // Console & Progress State
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'log' | 'progress' | 'error' | 'done'}[]>([])
  const [progressPercent, setProgressPercent] = useState(0)
  const [foundCount, setFoundCount] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/knowledge')
      if (res.ok) {
        const data = await res.json()
        setSources(data.sources || [])
        setProcessedSources(data.processedSources || [])
        setSnippets(data.snippets || [])
      }
    } catch (e) {
      console.error("Failed to fetch knowledge", e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error("Błąd podczas przesyłania")
      
      setUploadStatus('success')
      setSources(prev => [file.name, ...prev])
    } catch (err) {
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadStatus('idle'), 3000)
    }
  }

  const handleDeleteSnippet = async (model: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć model ${model} z bazy wiedzy?`)) return

    try {
      const res = await fetch(`/api/knowledge/snippets/${encodeURIComponent(model)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSnippets(prev => prev.filter(s => s.model !== model))
      } else {
        const data = await res.json()
        alert(data.error || "Błąd podczas usuwania")
      }
    } catch (e) {
      alert("Wystąpił błąd połączenia")
    }
  }

  const handleValidateKey = async () => {
    if (!tempApiKey) return
    setIsValidatingKey(true)
    setValidationResult(null)
    try {
      const res = await fetch('/api/knowledge/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tempApiKey })
      })
      const data = await res.json()
      if (res.ok) {
        setValidationResult({
          success: true,
          recommended: data.recommended,
          availableModels: data.availableModels || [],
          message: data.message
        })
      } else {
        setValidationResult({
          success: false,
          recommended: "",
          message: data.error || "Błąd walidacji"
        })
      }
    } catch (e) {
      setValidationResult({
        success: false,
        recommended: "",
        message: "Wystąpił błąd połączenia z serwerem walidacji"
      })
    } finally {
      setIsValidatingKey(false)
    }
  }

  const handleTrainAI = () => {
    if (!trainingFile || !tempApiKey) return
    
    setIsTraining(true)
    setLogs([{ time: new Date().toLocaleTimeString(), msg: "Inicjalizacja połączenia...", type: 'log' }])
    setProgressPercent(0)
    setFoundCount(0)
    setIsDone(false)

    const params = new URLSearchParams({
      filename: trainingFile,
      apiKey: tempApiKey,
      modelId: validationResult?.recommended || '',
      availableModels: (validationResult?.availableModels || []).join(',')
    })

    const eventSource = new EventSource(`/api/knowledge/train/stream?${params.toString()}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'log') {
        setLogs(prev => [...prev.slice(-100), { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'log' }])
        if (data.percent !== undefined) setProgressPercent(data.percent)
      } else if (data.type === 'progress') {
        setFoundCount(data.count || 0)
        setLogs(prev => [...prev.slice(-100), { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'progress' }])
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'error' }])
        setIsMinimized(false) // Auto-restore on error
        eventSource.close()
      } else if (data.type === 'done') {
        setLogs(prev => [...prev, { time: data.timestamp || new Date().toLocaleTimeString(), msg: data.message, type: 'done' }])
        setIsMinimized(false) // Auto-restore on success
        setIsDone(true)
        setProgressPercent(100)
        eventSource.close()
        fetchData() 
      }
    }

    eventSource.onerror = () => {
      setLogs(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString(), msg: "Krytyczny błąd połączenia (SSE). Sprawdź logi serwera lub spróbuj ponownie.", type: 'error' }])
      setIsMinimized(false) // Auto-restore to show error
      eventSource.close()
    }
  }

  const handleClearAllKnowledge = async () => {
    if (!confirm("UWAGA: Czy na pewno chcesz WYCZYŚCIĆ CAŁĄ BDZĘ WIEDZY? Tej operacji nie można cofnąć.")) return

    try {
      const res = await fetch('/api/knowledge', {
        method: 'DELETE'
      })
      if (res.ok) {
        setSnippets([])
        setProcessedSources([])
        alert("Baza wiedzy została całkowicie wyczyszczona.")
      } else {
        const data = await res.json()
        alert(data.error || "Błąd podczas czyszczenia bazy")
      }
    } catch (e) {
      alert("Wystąpił błąd połączenia")
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-20 px-4" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Brain className="h-9 w-9 text-blue-500" />
            Inteligentne Archiwum Katalogów
          </h2>
          <p className="text-muted-foreground">
            Baza wiedzy zasilana Katalogami PDF i Cennikami XLS.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR: Upload & Library */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-blue-100 dark:border-blue-900 overflow-hidden">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-500" />
                Zasil wiedzę
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {/* Upload Zone */}
              <div className="relative group">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all ${
                  isUploading ? "bg-muted animate-pulse" : "border-muted-foreground/20 hover:border-blue-500 hover:bg-blue-50/30"
                }`}>
                  <div className="p-3 bg-blue-50 text-blue-500 rounded-full">
                    {isUploading ? <RefreshCcw className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Wgraj cennik/katalog</p>
                    <p className="text-[11px] text-muted-foreground mt-1">PDF lub Excel (XLSX)</p>
                  </div>
                </div>
              </div>

              {/* Library List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1 flex items-center gap-2">
                  <BookOpen className="h-3 w-3" />
                  Biblioteka dokumentacji
                </h4>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {sources.map((source, index) => {
                    const isProcessed = processedSources.includes(source);
                    return (
                      <div key={index} className="group/item flex items-center justify-between p-3 rounded-lg border bg-background hover:border-blue-300 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={source.endsWith('.pdf') ? "text-red-500" : "text-green-500"}>
                            {source.endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                          </div>
                          <span className="text-xs font-medium truncate">{source}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
                          {/* Brain Button for Training */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-7 w-7 rounded-full ${isProcessed ? 'text-blue-500 bg-blue-50 hover:bg-blue-100' : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-50'}`}
                            title={isProcessed ? "Wiedza zaktualizowana" : "Naucz AI z tego pliku"}
                            onClick={() => setTrainingFile(source)}
                          >
                            <Brain className={`h-4 w-4 ${isProcessed ? 'animate-pulse' : ''}`} />
                          </Button>
                          <a href={`/uploads/catalogs/${source}`} download className="p-1.5 text-muted-foreground hover:text-blue-500 rounded-full hover:bg-blue-50">
                            <Upload className="h-4 w-4 rotate-180" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN: Knowledge Board */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-lg border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-4 w-full">
                <CardTitle className="text-xl flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Wyuczona Wiedza AI
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                      {snippets.length} modeli
                    </Badge>

                    {/* MINI CONSOLE BADGE */}
                    {(isTraining || isDone) && isMinimized && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-4 flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold cursor-pointer hover:bg-blue-700 shadow-md transition-all animate-pulse"
                        onClick={() => setIsMinimized(false)}
                      >
                        <Brain className="h-3 w-3" />
                        PRZETWARZANIE: {progressPercent}% (+{foundCount})
                      </motion.div>
                    )}
                  </span>
                  {snippets.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearAllKnowledge}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50 text-[10px] h-8 gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Wyczyść wszystko
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>Techniczna inteligencja wyciągnięta z Twoich katalogów</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Przeszukaj bazę wiedzy (modele, specyfikacje...)" 
                  className="pl-10 h-11 bg-muted/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-4">
                  {snippets
                    .filter(s => 
                      s.model.toUpperCase().includes(searchQuery.toUpperCase()) || 
                      s.specs.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((snippet) => (
                    <div 
                      key={snippet.id}
                      className="p-5 rounded-xl border bg-card hover:border-blue-200 transition-colors group relative shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${snippet.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {snippet.type === 'pdf' ? <FileText className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <h4 className="font-bold text-lg text-primary">{snippet.model}</h4>
                            <Badge variant="secondary" className="px-2 py-0 h-5 text-[9px] font-mono border-blue-100 bg-blue-50 text-blue-700">
                              {snippet.source}
                            </Badge>
                            {snippet.price !== null && snippet.price !== undefined && (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">
                                {snippet.price.toFixed(2)} {snippet.currency || 'PLN'} netto
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed italic pr-12">
                            "{snippet.specs}"
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 flex items-center gap-4">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {snippet.date}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-opacity"
                          onClick={() => handleDeleteSnippet(snippet.model)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {snippets.length === 0 && (
                    <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                      <p className="text-muted-foreground">Brak danych w bazie wiedzy. Wgraj i "wyucz" pierwszy dokument.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TRAINING MODAL */}
      <Dialog open={!!trainingFile && !isMinimized} onOpenChange={(open) => {
        if (!open) {
          if (isTraining && !isDone) {
            setIsMinimized(true);
          } else {
            setTrainingFile(null);
            setIsMinimized(false);
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-500" />
              Naucz AI z Katalogu
            </DialogTitle>
            {isTraining && !isDone && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground mr-6" 
                onClick={() => setIsMinimized(true)}
                title="Minimalizuj do ikony"
              >
                <div className="w-4 h-0.5 bg-current" />
              </Button>
            )}
          </DialogHeader>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">
                Wprowadź jednorazowy klucz Gemini, aby system przeanalizował <strong>{trainingFile}</strong> i wyciągnął z niego dane techniczne.
                {isDone && <span className="block mt-2 text-green-600 font-bold">Proces zakończony. Możesz zamknąć to okno.</span>}
                {!isTraining && !isDone && logs.some(l => l.type === 'error') && <span className="block mt-2 text-red-600 font-bold">Wystąpił błąd. Przejrzyj logi poniżej zanim zamkniesz okno.</span>}
              </div>
            </DialogDescription>
          <div className="space-y-6 py-4">
            {!isTraining && !isDone && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground">Klucz API Gemini (Flash v1.5)</Label>
                  <Input 
                    type="password"
                    placeholder="Wklej klucz tutaj..."
                    value={tempApiKey}
                    onChange={(e) => {
                      setTempApiKey(e.target.value)
                      setValidationResult(null)
                    }}
                    className="bg-muted/30"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[11px] border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={handleValidateKey}
                      disabled={!tempApiKey || isValidatingKey}
                    >
                      {isValidatingKey ? <RefreshCcw className="h-3 w-3 animate-spin mr-2" /> : <RefreshCcw className="h-3 w-3 mr-2" />}
                      Diagnozuj Klucz i Model
                    </Button>
                  </div>

                  {validationResult && (
                    <div className={`mt-3 p-3 rounded-lg border text-[11px] ${
                      validationResult.success 
                      ? "bg-green-50 border-green-100 text-green-700" 
                      : "bg-red-50 border-red-100 text-red-700"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {validationResult.success ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        <span className="font-bold">{validationResult.success ? "Klucz Zweryfikowany" : "Problem z kluczem"}</span>
                      </div>
                      <p>{validationResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(isTraining || isDone) && (
              <div className="space-y-4">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">Postęp</p>
                    <p className="text-2xl font-black text-blue-700">{progressPercent}%</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50/50 border border-green-100 text-center">
                    <p className="text-[10px] uppercase font-bold text-green-500 mb-1">DODANO</p>
                    <p className="text-2xl font-black text-green-700">+{foundCount}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Console View */}
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-[10px] space-y-1 h-48 overflow-y-auto border border-slate-800 shadow-inner">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className={
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'progress' ? 'text-green-400' : 
                        log.type === 'done' ? 'text-blue-400 font-bold' : 
                        'text-slate-300'
                      }>
                        {log.type === 'progress' ? '◆ ' : '○ '}
                        {log.msg}
                      </span>
                    </div>
                  ))}
                  <div id="console-bottom"></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <div className="flex gap-2 w-full justify-end">
              {!isTraining && !isDone && (
                <>
                  <Button variant="ghost" onClick={() => setTrainingFile(null)}>Anuluj</Button>
                  <Button 
                    disabled={!tempApiKey} 
                    onClick={handleTrainAI}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Uruchom trening wiedzy
                  </Button>
                </>
              )}
              {(isDone || (!isTraining && logs.some(l => l.type === 'error'))) && (
                <Button 
                  onClick={() => {
                    setTrainingFile(null)
                    setIsDone(false)
                    setIsTraining(false)
                    setLogs([])
                  }}
                  className={`${isDone ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white w-full sm:w-auto`}
                >
                  {isDone ? 'Zamknij i zobacz wyniki' : 'Zamknij konsolę (Błąd)'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
