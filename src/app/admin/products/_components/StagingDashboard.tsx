// src/app/admin/products/_components/StagingDashboard.tsx
"use client";

import { memo, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Search, ChevronDown, AlertTriangle, Trash2, Check, Zap, Filter, Activity } from "lucide-react";
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
    <div className="staging-container space-y-8 animate-in slide-in-from-top-12 duration-1000 p-10 rounded-[4rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border-2 border-white dark:border-slate-800 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.15)]">
      
      {/* COMMAND HEADER V12 */}
      <div className="flex flex-col xl:flex-row items-center gap-10">
        
        {/* STATUS ORB & TITLE */}
        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-6 rounded-[2rem] shadow-2xl transition-all duration-700 relative overflow-hidden group active:scale-90 ${isCollapsed ? 'bg-slate-900' : 'bg-primary shadow-primary/20 rotate-12'}`}
          >
            <Zap className={`w-8 h-8 text-white relative z-10 transition-transform duration-700 ${isCollapsed ? 'rotate-180' : ''}`} />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                Biurko <span className="text-primary italic">Weryfikacyjne</span>
              </h2>
              {isCollapsed && <Badge className="bg-primary text-slate-900 border-none font-black text-[10px] px-3 py-1 rounded-full">{payload.length} POZ.</Badge>}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{payload.filter(isItemConfirmed).length} / {payload.length} Autoryzowanych</span>
              </div>
              {isTraining && (
                <div className="bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full flex items-center gap-2 border border-blue-600/20">
                   <Activity className="w-3 h-3 animate-spin" />
                   <span className="text-[8px] font-black uppercase">Analiza IQ Sync: {progressPercent}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* NEURAL FILTERS & SEARCH */}
        {!isCollapsed && (
          <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-right-8 duration-700">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-all duration-300" />
              <input 
                placeholder="Szukaj w centrum weryfikacji..."
                className="w-full h-16 pl-16 pr-8 rounded-[1.8rem] bg-white/60 dark:bg-slate-800/60 border-2 border-slate-100 dark:border-slate-800 focus:border-primary outline-none text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest transition-all placeholder:text-slate-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
                onClick={() => setShowConflictsOnly(!showConflictsOnly)}
                className={`h-16 px-8 rounded-[1.8rem] flex items-center gap-4 transition-all font-black text-[10px] uppercase tracking-widest border-2 ${showConflictsOnly ? 'bg-orange-500 text-white border-orange-500 shadow-xl shadow-orange-500/20' : 'bg-white/60 dark:bg-slate-800/60 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-orange-200'}`}
            >
              <AlertTriangle className={`w-5 h-5 ${showConflictsOnly ? 'animate-bounce' : 'text-orange-400'}`} />
              Tylko Konflikty
            </button>
          </div>
        )}

        {/* MASTER ACTIONS */}
        <div className="shrink-0">
          <div className="flex gap-4">
             <Button 
                variant="ghost" 
                onClick={onClear} 
                className="h-16 px-8 rounded-[1.8rem] text-red-500 hover:bg-red-500 hover:text-white font-black uppercase text-[10px] tracking-widest flex gap-3 transition-all border border-transparent hover:shadow-2xl active:scale-95"
              >
                <Trash2 className="w-5 h-5" /> Wyczyść
              </Button>
              <Button 
                onClick={onCommitAll} 
                disabled={importing || !allConfirmed} 
                className={`h-16 px-10 rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all relative overflow-hidden group ${
                  !allConfirmed ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 group-hover:bg-primary group-hover:text-white'
                }`}
              >
                {importing ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-3">
                    Autoryzuj całą paczkę <Check className="w-5 h-5" />
                  </span>
                )}
                {!allConfirmed && <div className="absolute inset-0 bg-slate-900/5 cursor-not-allowed" />}
              </Button>
          </div>
        </div>
      </div>

      {/* VERIFICATION LIST */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/50"
          >
            {importSummary && (
              <div className={`p-8 rounded-[2.5rem] border-2 animate-in slide-in-from-left-8 duration-700 ${
                importSummaryType === 'error' ? 'bg-red-50/50 border-red-200 text-red-900' : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-[1.5rem] shadow-xl ${importSummaryType === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {importSummaryType === 'error' ? <AlertTriangle className="w-6 h-6 border-none" /> : <Check className="w-6 h-6" />}
                  </div>
                  <div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter">Raport Systemowy</h3>
                     <p className="font-bold opacity-70 text-sm italic leading-relaxed whitespace-pre-line mt-1">{importSummary}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filtered.slice(0, visibleCount).map((item, index) => (
                  <motion.div
                    key={item.tempId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <StagingItem 
                      item={item} categories={categories} manufacturers={manufacturers}
                      onUpdate={onUpdateItem} onCommit={onCommitItem} onRemove={onRemoveItem}
                      isItemConfirmed={isItemConfirmed}
                      isSelected={selectedIds.includes(item.tempId)}
                      onToggleSelect={() => toggleSelect(item.tempId)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleCount < filtered.length && (
                <div className="pt-10 pb-6 flex justify-center">
                  <Button 
                    onClick={() => setVisibleCount(v => v + 50)} 
                    variant="ghost" 
                    className="h-16 px-12 rounded-[2rem] bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest gap-4 border-2 border-transparent hover:border-primary transition-all group"
                  >
                    <ChevronDown className="w-6 h-6 animate-bounce group-hover:text-primary" /> 
                    Zwolnij Kolejne ({filtered.length - visibleCount})
                  </Button>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
