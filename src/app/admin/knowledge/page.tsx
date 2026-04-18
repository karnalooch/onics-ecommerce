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
  RefreshCcw,
  BookOpen,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext"

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
  const { 
    isDone,
    setTrainingFile,
  } = useKnowledge()

  const [snippets, setSnippets] = useState<KnowledgeSnippet[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [processedSources, setProcessedSources] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')

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

  // Refresh snippets when analysis is done globally
  useEffect(() => {
    if (isDone) {
      fetchData()
    }
  }, [isDone])

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
          <Card className="shadow-lg border-t-4 border-t-blue-500 overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                    <CardTitle className="text-xl font-black tracking-tight">Wyuczona Wiedza AI</CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 text-[10px] font-bold">
                      {snippets.length} modeli
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Techniczna inteligencja wyciągnięta z Twoich katalogów
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  {snippets.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearAllKnowledge}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50 text-[10px] font-bold h-9 px-3 gap-2 rounded-xl transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Wyczyść wszystko</span>
                    </Button>
                  )}
                </div>
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
    </div>
  )
}
