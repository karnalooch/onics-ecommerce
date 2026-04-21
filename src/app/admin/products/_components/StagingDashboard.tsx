// src/app/admin/products/_components/StagingDashboard.tsx
"use client";

import { memo, useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  Search, 
  ChevronDown, 
  AlertTriangle, 
  Trash2, 
  Check, 
  Zap, 
  Filter, 
  Activity,
  RefreshCcw,
  Database
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StagingItem } from "./StagingItem";
import { Badge } from "@/components/ui/badge";
import { StagingBatchActions } from "./StagingBatchActions";

interface IStagingDashboardProps {
  payload: any[];
  importing: boolean;
  onClear: () => void;
  onCommitAll: () => void;
  onRemoveItem: (id: string, sku: string) => void;
  onUpdateItem: (id: string, field: string, value: any) => void;
  onCommitItem: (id: string) => void;
  onBatchUpdate: (ids: string[], field: string, value: any) => void;
  onBatchCommit: (ids: string[]) => void;
  isTraining?: boolean;
  progressPercent?: number;
  categories: any[];
  manufacturers: string[];
  importSummary?: string | null;
  importSummaryType?: "success" | "error";
  isItemConfirmed: (item: any) => boolean;
}

export const StagingDashboard = memo(function StagingDashboard({
  payload, importing, onClear, onCommitAll, onUpdateItem, onCommitItem,
  onRemoveItem, onBatchUpdate, onBatchCommit, categories, manufacturers, importSummary, importSummaryType,
  isItemConfirmed, isTraining, progressPercent
}: IStagingDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showCleanOnly, setShowCleanOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = useMemo(() => {
    let result = payload;
    if (showConflictsOnly) result = result.filter(i => i.priceMismatch);
    if (showCleanOnly) result = result.filter(i => i.qualityLevel === 'HIGH');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.sku?.toLowerCase().includes(q) || i.name?.toLowerCase().includes(q));
    }
    return result;
  }, [payload, searchQuery, showConflictsOnly, showCleanOnly]);

  const allConfirmed = useMemo(() => payload.every(isItemConfirmed), [payload, isItemConfirmed]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 select-none no-blur">
      
      {/* 1. STAGING MASTER HEADER */}
      <div className="flex flex-col xl:flex-row items-center gap-8 border-b border-slate-100 pb-8">
        
        {/* STATUS & HUB IDENTITY */}
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-14 h-14 flex items-center justify-center transition-all bg-slate-950 text-white active-press rounded-none ${isCollapsed ? 'opacity-50' : ''}`}
          >
            <Database className={`w-7 h-7 text-primary transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">
                STAGING_TERMINAL <span className="text-slate-400 not-italic">_BUFFER</span>
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic leading-none">
                  Status: {payload.filter(isItemConfirmed).length} / {payload.length} REKORDÓW_ZWERYFIKOWANYCH
                </span>
              </div>
              {isTraining && (
                <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-100">
                   <Activity className="w-3 h-3 text-primary animate-spin" />
                   <span className="text-[8px] font-black uppercase text-slate-600">ANALIZA_SYNC: {progressPercent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* FILTERS AREA */}
        {!isCollapsed && (
          <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-4 animate-in slide-in-from-right-4">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                placeholder="FILTRUJ_BUFOR_DANYCH..."
                className="w-full h-11 pl-12 pr-4 bg-blue-50 border border-transparent focus:border-primary outline-none text-[10px] font-black text-slate-950 uppercase tracking-widest transition-all placeholder:text-slate-400 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
                onClick={() => setShowConflictsOnly(!showConflictsOnly)}
                className={`h-11 px-6 flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest border active-press ${showConflictsOnly ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
            >
              <AlertTriangle className={`w-4 h-4 ${showConflictsOnly ? 'text-primary' : 'text-slate-200'}`} />
              Konflikty
            </button>
          </div>
        )}

        {/* MASTER_COMMANDS */}
        <div className="flex gap-2">
           <button 
              onClick={onClear} 
              className="h-11 px-6 bg-white border border-slate-100 text-slate-300 hover:text-red-600 hover:border-red-100 font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all active-press"
            >
              <Trash2 className="w-4 h-4" /> Wyczyść
            </button>
            <button 
              onClick={onCommitAll} 
              disabled={importing || !allConfirmed} 
              className={`h-11 px-8 font-black uppercase tracking-widest text-[10px] transition-all relative overflow-hidden active-press ${
                !allConfirmed ? 'bg-slate-50 text-slate-200 border border-slate-50 cursor-not-allowed' : 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20'
              }`}
            >
              {importing ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-3 leading-none">
                  AUTORYZUJ_TRANSFER <Check className="w-4 h-4" />
                </span>
              )}
            </button>
        </div>
      </div>

      {/* VERIFICATION SPACE */}
      <AnimatePresence>
        {!isCollapsed && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-500">
            {importSummary && (
              <div className={`p-6 border-l-4 rounded-none ${
                importSummaryType === 'error' ? 'bg-red-50 border-red-500 text-red-900' : 'bg-slate-50 border-primary text-slate-900'
              }`}>
                <div className="flex items-center gap-6">
                  <div className={`w-10 h-10 flex items-center justify-center ${importSummaryType === 'error' ? 'bg-red-500 text-white' : 'bg-slate-950 text-white'}`}>
                    {importSummaryType === 'error' ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                     <h3 className="text-[11px] font-black uppercase italic tracking-[0.2em] leading-none mb-1">Raport_Systemowy_IQ</h3>
                     <p className="font-bold text-[10px] uppercase tracking-widest opacity-60 leading-relaxed whitespace-pre-line">{importSummary}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {filtered.slice(0, visibleCount).map((item) => (
                <StagingItem 
                  key={item.tempId}
                  item={item} categories={categories} manufacturers={manufacturers}
                  onUpdate={onUpdateItem} onCommit={onCommitItem} onRemove={onRemoveItem}
                  isItemConfirmed={isItemConfirmed}
                  isSelected={selectedIds.includes(item.tempId)}
                  onToggleSelect={() => toggleSelect(item.tempId)}
                />
              ))}

              {visibleCount < filtered.length && (
                <div className="pt-8 flex justify-center">
                  <button 
                    onClick={() => setVisibleCount(v => v + 50)} 
                    className="h-10 px-8 bg-slate-50 border border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:text-slate-950 transition-all active-press"
                  >
                    <ChevronDown className="w-4 h-4 animate-bounce" /> 
                    Zwolnij_Blok_Danych ({filtered.length - visibleCount})
                  </button>
                </div>
              )}
            </div>

            <StagingBatchActions 
              selectedIds={selectedIds}
              onBatchUpdate={onBatchUpdate}
              onBatchCommit={onBatchCommit}
              categories={categories}
              manufacturers={manufacturers}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
