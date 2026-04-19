// src/app/admin/catalog/KnowledgeDashboardClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useKnowledge } from "@/lib/knowledge/KnowledgeContext";
import { toast } from "sonner";
import { Brain, Upload, FileText, FileSpreadsheet, Search, Trash2, RefreshCcw, BookOpen, Zap, Download, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCatalogStore } from "@/store/catalogStore";
import { StructureManager } from "./_components/StructureManager";
import { autonomousProvisioningAction } from "../products/_actions";

export function KnowledgeDashboardClient({ compact = false, label = "Baza produktów" }: { compact?: boolean, label?: string }) {
  const { isDone, sessionResults, isTraining, setTrainingFile, resetState } = useKnowledge();
  const { setStagingPayload, setShowStaging } = useCatalogStore();
  const funneledRef = useRef<string | null>(null);

  const [snippets, setSnippets] = useState<any[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [processedSources, setProcessedSources] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  // V16.2: Autonomous Provisioning Engine
  useEffect(() => {
    if (isDone && sessionResults && Object.keys(sessionResults).length > 0 && funneledRef.current !== JSON.stringify(Object.keys(sessionResults).slice(0, 5))) {
      
      const extractions = Object.entries(sessionResults).map(([sku, entry]: [string, any]) => ({
        ...entry,
        model: entry.model || sku
      }));

      setIsProvisioning(true);
      const startProvisioning = async () => {
        const res = await autonomousProvisioningAction(extractions);
        setIsProvisioning(false);
        
        if (res.success) {
          toast.success(res.message);
          // If there's quarantined (dirty) data, move to Biurko
          if (res.data && res.data.length > 0) {
            setStagingPayload(res.data);
            setShowStaging(true);
            toast.info(`Wykryto ${res.data.length} pozycji wymagających kwarantanny na Biurku.`);
          }
          fetchData(); // Refresh structure and knowledge
        } else {
          toast.error(res.error);
        }
      };

      startProvisioning();
      funneledRef.current = JSON.stringify(Object.keys(sessionResults).slice(0, 5));
    }
    
    if (isTraining && !isDone) {
      funneledRef.current = null;
    }
  }, [isDone, isTraining, sessionResults]);

  const fetchData = async () => {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      const data = await res.json();
      setSources(data.sources || []);
      setProcessedSources(data.processedSources || []);
      setSnippets(data.snippets || []);
      setCategories(data.registry?.categories || []);
      setManufacturers(data.registry?.manufacturers || []);
    }
  };

  const handleClearKnowledge = async () => {
    if (!confirm("Czy na pewno chcesz wyczyścić CAŁĄ bazę produktów? Tej operacji nie można cofnąć.")) return;
    const res = await fetch('/api/knowledge', { method: 'DELETE' });
    if (res.ok) {
      setSnippets([]);
      setSources([]);
      setProcessedSources([]);
      toast.success("Baza została wyczyszczona.");
      fetchData();
    }
  };

  const handleDeleteSource = async (filename: string) => {
    const res = await fetch(`/api/knowledge?source=${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
       setSources(prev => prev.filter(s => s !== filename));
       toast.success(`Usunięto źródło: ${filename}`);
       fetchData();
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
      const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setSources(prev => [file.name, ...prev]);
        toast.success(`Wgrano plik: ${file.name}. Rozpoczynam procedurę Neural Sieve...`);
      }
    } catch (err) {
      toast.error("Błąd podczas wgrywania pliku.");
    } finally { setIsUploading(false); }
  };

  if (compact) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-700 h-full flex flex-col">
         {/* 1. Health & Upload Summary */}
         <KnowledgeSummary 
            sources={sources} 
            snippets={snippets} 
            isUploading={isUploading || isProvisioning} 
            onUpload={handleFileUpload} 
            compact={compact}
         />
         
         {/* 2. Structure Manager (New) */}
         <div className="shrink-0">
            <StructureManager 
               categories={categories} 
               manufacturers={manufacturers} 
               onRefresh={fetchData} 
            />
         </div>

         {/* 3. Compact Sources List */}
         <CompactSourcesBlock 
            sources={sources} 
            isUploading={isUploading} 
            onUpload={handleFileUpload} 
            onDelete={handleDeleteSource}
            onTrain={setTrainingFile}
            processedSources={processedSources}
            compact={compact}
         />

         {/* 4. Searchable Models List */}
         <div className="flex-1 min-h-0">
            <KnowledgeList 
               compact 
               snippets={snippets} 
               searchQuery={searchQuery} 
               onSearch={setSearchQuery} 
               onClear={handleClearKnowledge} 
            />
         </div>
      </div>
    );
  }

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

function KnowledgeSummary({ sources, snippets, isUploading, onUpload, compact, label }: any) {
  const formattedCount = new Intl.NumberFormat('pl-PL').format(snippets.length);

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white overflow-hidden shrink-0 relative group">
      {/* Dynamic Background Element */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000" />
      
      <CardContent className={`${compact ? 'p-5' : 'p-8'} relative z-10`}>
        <div className={`flex items-start justify-between ${compact ? 'mb-4' : 'mb-8'}`}>
          <div className="flex items-center gap-4">
            <div className="relative">
               <div className="absolute inset-0 bg-blue-400 blur-xl opacity-40 animate-pulse" />
               <div className="relative p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                  <Layers className="w-6 h-6 text-white" />
               </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/60 leading-none mb-1">Neural Sieve V16.2</p>
              <h3 className={`${compact ? 'text-2xl' : 'text-3xl'} font-black italic tracking-tighter tabular-nums leading-none uppercase`}>
                 {label}
              </h3>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl">
            <input type="file" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <Button size="icon" className="h-12 w-12 bg-white/10 hover:bg-white/100 hover:text-blue-600 backdrop-blur-md rounded-2xl border border-white/20 transition-all duration-300 shadow-xl">
              {isUploading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-blue-100/40">
             <span>Data Sources</span>
             <span>System Integrity: 98%</span>
          </div>
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="text-[9px] border-white/20 text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full uppercase font-black transition-colors">
                {sources.length} Źródeł PDF
             </Badge>
             <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 w-[85%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
             </div>
             <p className="text-[9px] font-black uppercase tracking-tighter opacity-40 italic">V9.81 CORE</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactSourcesBlock({ sources, isUploading, onUpload, onDelete, onTrain, processedSources, compact }: any) {
   return (
      <Card className="border-none shadow-xl rounded-[2rem] bg-white/80 backdrop-blur-md overflow-hidden shrink-0">
         <CardHeader className="p-5 pb-2 border-b border-slate-100">
            <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
               <BookOpen className="w-3 h-3 text-blue-500" /> Katalogi Techniczne
            </h4>
         </CardHeader>
         <CardContent className={`${compact ? 'p-3' : 'p-4'} space-y-4`}>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-hide">
               {sources.map((s: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl hover:border-blue-200 transition-all group">
                     <div className="flex items-center gap-2 overflow-hidden">
                        {s.endsWith('.pdf') ? <FileText className="w-3 h-3 text-red-400 shrink-0" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span className="text-[10px] font-bold truncate max-w-[120px]">{s}</span>
                     </div>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => onTrain(s)} className={`h-6 w-6 rounded-lg ${processedSources.includes(s) ? 'text-blue-500 bg-blue-50' : 'text-slate-300'}`}>
                           <Brain className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(s)} className="h-6 w-6 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50">
                           <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                     </div>
                  </div>
               ))}
               {sources.length === 0 && (
                  <div className="text-center py-4 text-slate-300 italic text-[10px] font-medium">Brak wgranych cenników</div>
               )}
            </div>
            
            <div className="relative group border-2 border-dashed border-slate-100 rounded-xl p-3 flex items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
               <input type="file" onChange={onUpload} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
               <Upload className="w-3 h-3 text-slate-400 group-hover:text-blue-500" />
               <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-blue-600 tracking-tight">Dodaj PDF / XLS</span>
            </div>
         </CardContent>
      </Card>
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
                {sources.map((s: any, i: number) => (
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

function KnowledgeList({ snippets, searchQuery, onSearch, onClear, compact = false }: any) {
  const ITEMS_PER_PAGE = compact ? 8 : 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset do pierwszej strony przy szukaniu
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filtered = snippets.filter((s: any) => 
    s.model.toUpperCase().includes(searchQuery.toUpperCase()) || 
    s.specs.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleSnippets = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className={`border-none shadow-xl overflow-hidden bg-white/60 backdrop-blur-md h-full flex flex-col ${compact ? 'rounded-[2rem]' : 'rounded-[3rem]'}`}>
       <CardHeader className={`${compact ? 'bg-blue-50/50 text-blue-900 border-b border-blue-100 p-6' : 'bg-slate-900 text-white p-8'} shrink-0`}>
          <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <CardTitle className={`${compact ? 'text-sm' : 'text-2xl'} font-black uppercase italic tracking-tighter flex items-center gap-3`}>
                    <Zap className={`w-5 h-5 ${compact ? 'text-blue-500' : 'text-yellow-400 fill-yellow-400'}`} /> {compact ? 'IQ Models' : 'Universal Hub'} <span className="text-primary italic">{compact ? '' : 'Hub'}</span>
                 </CardTitle>
                 {!compact && <CardDescription className="text-white/40 text-[10px] uppercase font-black tracking-widest leading-none">Techniczne IQ ekstrahowane z dokumentacji</CardDescription>}
              </div>
              <div className="flex items-center gap-2">
                 {!compact && (
                    <Button 
                      variant="ghost" 
                      onClick={() => window.location.href = '/api/knowledge/export'}
                      className="h-8 px-3 rounded-full text-slate-400 hover:text-emerald-400 font-black uppercase text-[9px] tracking-widest gap-2"
                    >
                      <Download className="w-3 h-3" /> Eksportuj
                    </Button>
                 )}
                 <Button variant="ghost" onClick={onClear} className={`h-8 w-8 p-0 rounded-full text-slate-400 hover:text-red-400`}>
                    <Trash2 className="w-3 h-3" />
                 </Button>
                 {compact ? (
                    <Badge className="bg-blue-100 text-blue-600 border-none font-black text-[9px]">{snippets.length}</Badge>
                 ) : (
                    <Badge className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-black italic">{snippets.length} Modeli</Badge>
                 )}
              </div>
          </div>
       </CardHeader>
       <CardContent className={`${compact ? 'p-6' : 'p-8'} space-y-6 flex-1 flex flex-col min-h-0`}>
          <div className="relative group shrink-0">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
             <Input placeholder="Szukaj IQ..." value={searchQuery} onChange={e => onSearch(e.target.value)} className={`${compact ? 'h-11 rounded-xl' : 'h-14 rounded-2xl'} pl-12 pr-6 bg-white border-2 border-slate-100 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold text-xs`} />
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6 min-h-0">
              {visibleSnippets.map((s: any) => (
                 <div key={s.id} className={`${compact ? 'p-4 rounded-2xl' : 'p-6 rounded-[2rem]'} bg-white border border-slate-100 hover:border-primary/20 transition-all shadow-sm group`}>
                    <div className={`flex items-start ${compact ? 'gap-3' : 'gap-6'}`}>
                       <div className={`rounded-xl shrink-0 ${compact ? 'p-2' : 'p-4'} ${s.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {s.type === 'pdf' ? <FileText className={compact ? "w-4 h-4" : "w-6 h-6"} /> : <FileSpreadsheet className={compact ? "w-4 h-4" : "w-6 h-6"} />}
                       </div>
                       <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                             <h4 className={`${compact ? 'text-xs' : 'text-lg'} font-black text-slate-800 tracking-tight truncate max-w-[120px]`}>{s.model}</h4>
                             {s.price && <Badge className="bg-emerald-500 text-white font-black text-[8px] h-5 px-2 rounded-full">{s.price.toFixed(2)}</Badge>}
                          </div>
                          <p className={`text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-2 ${compact ? 'text-[9px] line-clamp-2' : 'text-sm'}`}>"{s.specs}"</p>
                       </div>
                    </div>
                 </div>
              ))}

             {filtered.length === 0 && (
               <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 mt-8">
                 <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <p className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Brak wyników w bazie</p>
               </div>
             )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 shrink-0">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Strona {currentPage} z {totalPages} 
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1} 
                  onClick={() => { setCurrentPage((p: number) => Math.max(1, p - 1)); }}
                  className="rounded-xl h-9 px-3 font-black uppercase text-[9px] tracking-widest border-2 border-slate-100 hover:bg-slate-50 disabled:opacity-30"
                >
                  Poprzednia
                </Button>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => { setCurrentPage((p: number) => Math.min(totalPages, p + 1)); }}
                  className="rounded-xl h-9 px-3 font-black uppercase text-[9px] tracking-widest border-2 border-slate-100 hover:bg-slate-50 disabled:opacity-30"
                >
                  Następna
                </Button>
              </div>
            </div>
          )}
       </CardContent>
    </Card>
  );
}
