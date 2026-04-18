// src/app/admin/products/_components/StagingDashboard.tsx
"use client";

import { memo, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Search, ChevronDown, AlertTriangle, Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { StagingItem } from "./StagingItem";

interface IStagingDashboardProps {
  payload: any[];
  importing: boolean;
  onClear: () => void;
  onCommitAll: () => void;
  onUpdateItem: (tempId: string, field: string, value: any) => void;
  onCommitItem: (tempId: string) => void;
  onRemoveItem: (id: string, sku: string) => void;
  categories: any[];
  manufacturers: string[];
  importSummary?: string | null;
  importSummaryType?: "success" | "error";
  isItemConfirmed: (item: any) => boolean;
}

export const StagingDashboard = memo(function StagingDashboard({
  payload, importing, onClear, onCommitAll, onUpdateItem, onCommitItem,
  onRemoveItem, categories, manufacturers, importSummary, importSummaryType,
  isItemConfirmed
}: IStagingDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = useMemo(() => {
    let result = payload;
    if (showConflictsOnly) {
      result = result.filter(i => i.priceMismatch);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.sku?.toLowerCase().includes(q) || i.name?.toLowerCase().includes(q));
    }
    return result;
  }, [payload, searchQuery, showConflictsOnly]);

  const conflictsCount = useMemo(() => payload.filter(i => i.priceMismatch).length, [payload]);

  const allConfirmed = useMemo(() => payload.every(isItemConfirmed), [payload, isItemConfirmed]);

  return (
    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 p-8 rounded-[40px] bg-orange-50/50 border-4 border-orange-200 shadow-2xl">
      <div className="flex items-center justify-between mb-8">
        <StagingHeader count={payload.length} confirmedCount={payload.filter(isItemConfirmed).length} />
        <div className="flex-1 max-w-sm ml-8 flex items-center gap-4">
          <StagingSearch value={searchQuery} onChange={setSearchQuery} />
          {conflictsCount > 0 && (
            <Button 
              onClick={() => setShowConflictsOnly(!showConflictsOnly)}
              variant={showConflictsOnly ? "destructive" : "outline"}
              className={`h-12 px-4 rounded-2xl flex gap-2 font-black transition-all ${
                showConflictsOnly ? 'bg-orange-600 border-none' : 'border-2 border-orange-200 text-orange-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] uppercase">Niezgodności ({conflictsCount})</span>
            </Button>
          )}
        </div>
        <StagingActions 
          onClear={onClear} 
          onCommitAll={onCommitAll} 
          importing={importing} 
          disabled={!allConfirmed} 
          summary={importSummary}
          summaryType={importSummaryType}
        />
      </div>

      <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-200">
        <AnimatePresence mode="popLayout">
          {filtered.slice(0, visibleCount).map(item => (
            <StagingItem 
              key={item.tempId} item={item} categories={categories} manufacturers={manufacturers}
              onUpdate={onUpdateItem} onCommit={onCommitItem} onRemove={onRemoveItem}
              isItemConfirmed={isItemConfirmed}
            />
          ))}
        </AnimatePresence>

        {visibleCount < filtered.length && (
          <div className="pt-8 pb-4 flex justify-center">
            <Button onClick={() => setVisibleCount(v => v + 50)} variant="outline" className="h-14 px-10 rounded-2xl border-2 border-orange-200 text-orange-700 font-black gap-3">
              <ChevronDown className="w-6 h-6 animate-bounce" /> Pokaż więcej ({filtered.length - visibleCount})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

function StagingHeader({ count, confirmedCount }: { count: number, confirmedCount: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-4 bg-orange-500 text-white rounded-[20px] shadow-lg shadow-orange-500/20 text-center flex flex-col items-center">
        <ArrowUpRight className="w-8 h-8" />
        <span className="text-[10px] uppercase font-black tracking-widest mt-1">BUFOR</span>
      </div>
      <div>
        <h2 className="text-2xl font-black text-orange-900 uppercase italic">Klasyfikacja <span className="text-orange-600 underline decoration-orange-300">Bufora</span></h2>
        <p className="text-orange-700/70 font-bold text-[10px] uppercase tracking-widest mt-1">Gotowe do zapisu: {confirmedCount} / {count}</p>
      </div>
    </div>
  );
}

function StagingSearch({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
      <input 
        placeholder="Filtruj bufor importu..."
        className="w-full h-12 pl-12 pr-6 rounded-2xl bg-white border-2 border-orange-100 focus:border-orange-500 outline-none text-xs font-bold transition-all placeholder:text-orange-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StagingActions({ onClear, onCommitAll, importing, disabled, summary, summaryType }: any) {
  return (
    <div className="flex gap-4 items-center">
      {summary && (
        <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-300 ${
          summaryType === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {summary}
        </div>
      )}
      <Button variant="ghost" onClick={onClear} className="h-12 px-6 rounded-2xl text-red-600 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest flex gap-2">
        <Trash2 className="w-4 h-4" /> Wyczyść Bufor
      </Button>
      <Button 
        onClick={onCommitAll} 
        disabled={importing || disabled} 
        className={`h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${
          disabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
        }`}
      >
        {importing ? "Mielenie..." : "Zatwierdź Wszystkie"}
      </Button>
    </div>
  );
}
