// src/app/admin/catalog/KnowledgeDashboardClient.tsx
"use client";

import { useState, useEffect } from "react";
import { Brain, Upload, FileText, FileSpreadsheet, Search, Trash2, RefreshCcw, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext";

export function KnowledgeDashboardClient() {
  const { isDone, setTrainingFile } = useKnowledge();
  const [snippets, setSnippets] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [processedSources, setProcessedSources] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources || []);
      setProcessedSources(data.processedSources || []);
      setSnippets(data.snippets || []);
    }
  };

  const handleClearKnowledge = async () => {
    if (!confirm("Czy na pewno chcesz wyczyścić CAŁĄ bazę wiedzy AI? Tej operacji nie można cofnąć.")) return;
    const res = await fetch('/api/knowledge', { method: 'DELETE' });
    if (res.ok) {
      setSnippets([]);
      setSources([]);
      setProcessedSources([]);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (isDone) fetchData(); }, [isDone]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
      setSources(prev => [file.name, ...prev]);
    } catch (err) {} finally { setIsUploading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-4 space-y-6">
        <UploadSection isUploading={isUploading} onUpload={handleFileUpload} sources={sources} processedSources={processedSources} onTrain={setTrainingFile} />
      </div>
      <div className="lg:col-span-8">
        <KnowledgeList snippets={snippets} searchQuery={searchQuery} onSearch={setSearchQuery} onClear={handleClearKnowledge} />
      </div>
    </div>
  );
}

function UploadSection({ isUploading, onUpload, sources, processedSources, onTrain }: any) {
  return (
    <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/60 backdrop-blur-md">
       <CardHeader className="bg-blue-50/50 p-8 border-b border-blue-100/50">
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 italic">
             <Upload className="w-6 h-6 text-blue-500" /> Zasil <span className="text-blue-500 italic">Mózg Platformy</span>
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wgrywaj cenniki PDF/XLS aby uczyć system AI</CardDescription>
       </CardHeader>
       <CardContent className="p-8 space-y-8">
          <div className="relative group">
             <input type="file" accept=".pdf,.xlsx,.xls" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
             <div className={`border-4 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 transition-all ${
               isUploading ? "bg-slate-50 animate-pulse" : "border-slate-100 hover:border-blue-500 hover:bg-blue-50/30"
             }`}>
                <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl shadow-lg shadow-blue-500/10">
                   {isUploading ? <RefreshCcw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div className="text-center font-black uppercase">
                   <p className="text-xs">Kliknij lub Upuść</p>
                   <p className="text-[9px] text-slate-400 mt-1">Cenniki dystrybutorów</p>
                </div>
             </div>
          </div>
          <div className="space-y-4">
             <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-2"><BookOpen className="w-3 h-3" /> Aktywne Źródła</h4>
             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {sources.map((s, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                         {s.endsWith('.pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                         <span className="text-[11px] font-bold truncate max-w-[150px]">{s}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onTrain(s)} className={`h-8 w-8 rounded-xl ${processedSources.includes(s) ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                         <Brain className={`w-4 h-4 ${processedSources.includes(s) && 'animate-pulse'}`} />
                      </Button>
                   </div>
                ))}
             </div>
          </div>
       </CardContent>
    </Card>
  );
}

function KnowledgeList({ snippets, searchQuery, onSearch, onClear }: any) {
  const filtered = snippets.filter((s: any) => 
    s.model.toUpperCase().includes(searchQuery.toUpperCase()) || 
    s.specs.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden bg-white/60 backdrop-blur-md h-full">
       <CardHeader className="bg-slate-900 text-white p-8">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
                <CardTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                   <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" /> Inteligencja <span className="text-primary italic">Katalogowa</span>
                </CardTitle>
                <CardDescription className="text-white/40 text-[10px] uppercase font-black tracking-widest leading-none">Techniczne IQ ekstrahowane z dokumentacji</CardDescription>
             </div>
             <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClear} className="h-8 px-3 rounded-full text-slate-400 hover:text-red-400 font-black uppercase text-[9px] tracking-widest gap-2">
                   <Trash2 className="w-3 h-3" /> Wyczyść Bazę
                </Button>
                <Badge className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-black italic">{snippets.length} Modeli</Badge>
             </div>
          </div>
       </CardHeader>
       <CardContent className="p-8 space-y-8">
          <div className="relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
             <Input placeholder="Szukaj w wyuczonej wiedzy..." value={searchQuery} onChange={e => onSearch(e.target.value)} className="h-14 pl-12 pr-6 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-sm" />
          </div>
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin">
             {filtered.map((s: any) => (
                <div key={s.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-primary/20 transition-all shadow-sm group">
                   <div className="flex items-start gap-6">
                      <div className={`p-4 rounded-2xl ${s.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                         {s.type === 'pdf' ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 space-y-2">
                         <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-black text-lg text-slate-800 tracking-tight">{s.model}</h4>
                            <Badge variant="outline" className="text-[8px] font-black uppercase text-slate-400 border-slate-100 leading-none h-5">{s.source}</Badge>
                            {s.price && <Badge className="bg-emerald-500 text-white font-black text-[10px] h-6 px-3 rounded-full">{s.price.toFixed(2)} {s.currency}</Badge>}
                         </div>
                         <p className="text-slate-500 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-4">"{s.specs}"</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       </CardContent>
    </Card>
  );
}
