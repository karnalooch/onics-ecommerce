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
    message: string
  } | null>(null)

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

  const handleTrainAI = async () => {
    if (!trainingFile || !tempApiKey) return
    
    setIsTraining(true)
    try {
      const response = await fetch('/api/knowledge/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: trainingFile, 
          apiKey: tempApiKey,
          modelId: validationResult?.recommended || undefined
        })
      })
      
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "Błąd serwera API");
      }

      // Refresh real data from server
      await fetchData()
      setTrainingFile(null)
      setTempApiKey("")
      setValidationResult(null)

      if (result.isBackground) {
        alert(result.message)
      } else if (result.count === 0) {
        alert(`Nauka zakończona, ale wyciągnięto 0 modeli. Sprawdź logi diagnostyczne: /debug-ropam.txt`)
      } else {
        alert(`Pomyślnie wyuczono ${result.count} nowych modeli!`)
      }
    } catch (err: any) {
      alert(err.message || "Wystąpił błąd podczas nauki AI")
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-20 px-4">
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
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Wyuczona Wiedza AI
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                    {snippets.length} modeli
                  </Badge>
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
                <AnimatePresence>
                  {snippets.filter(s => s.model.toUpperCase().includes(searchQuery.toUpperCase()) || s.specs.includes(searchQuery)).map((snippet) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={snippet.id}
                      className="p-5 rounded-xl border bg-card hover:bg-muted/10 transition-colors group relative"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl ${snippet.type === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {snippet.type === 'pdf' ? <FileText className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg text-primary">{snippet.model}</h4>
                            <Badge variant="secondary" className="px-2 py-0 h-5 text-[9px] font-mono border-blue-100 bg-blue-50 text-blue-700">
                              {snippet.source}
                            </Badge>
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TRAINING MODAL */}
      <Dialog open={!!trainingFile} onOpenChange={(open) => !open && setTrainingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-blue-500" />
              Naucz AI z Katalogu
            </DialogTitle>
            <DialogDescription>
              Wprowadź jednorazowy klucz Gemini, aby system przeanalizował <strong>{trainingFile}</strong> i wyciągnął z niego dane techniczne.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                  disabled={!tempApiKey || isValidatingKey || isTraining}
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

              <p className="text-[10px] text-muted-foreground italic mt-2">
                Klucz zostanie użyty tylko do tej operacji i zniknie natychmiast po jej zakończeniu.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            {isTraining && (
               <div className="flex items-center gap-2 text-[11px] text-blue-600 animate-pulse mr-auto">
                 <RefreshCcw className="h-3 w-3 animate-spin" />
                 Analizowanie stron PDF... (Zajmie to chwilę)
               </div>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setTrainingFile(null)} disabled={isTraining}>Anuluj</Button>
              <Button 
                disabled={!tempApiKey || isTraining} 
                onClick={handleTrainAI}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isTraining ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {isTraining ? "Trwa nauka..." : "Uruchom trening wiedzy"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
