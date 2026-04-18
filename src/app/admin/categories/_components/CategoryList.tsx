// src/app/admin/categories/_components/CategoryList.tsx
"use client";

import { 
  Folder, Edit2, Trash2, ChevronRight, Plus,
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, any> = {
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic, Folder
};

export function CategoryList({ 
  categories, activeCatId, onSelect, onAdd, onDelete, onStartRename, 
  renamingId, renameValue, onSetRenameValue, onConfirmRename, onCancelRename,
  newCatName, onNewCatNameChange
}: any) {
  return (
    <Card className="shadow-2xl border-none rounded-[3rem] overflow-hidden bg-white/50 backdrop-blur-sm border border-white/20">
      <CardHeader className="pb-6 border-b bg-slate-900 text-white pt-8">
        <CardTitle className="text-xl font-black uppercase tracking-tight italic">Główne <span className="text-primary italic">Działy</span></CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col max-h-[600px] overflow-y-auto">
          {categories.map((cat: any) => (
            <CategoryItem 
              key={cat.id} 
              cat={cat} 
              isActive={activeCatId === cat.id} 
              onSelect={onSelect}
              onDelete={onDelete}
              onStartRename={onStartRename}
              renamingId={renamingId}
              renameValue={renameValue}
              onSetRenameValue={onSetRenameValue}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
            />
          ))}
        </div>
        <div className="p-6 border-t bg-slate-50/50">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newCatName}
              onChange={e => onNewCatNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAdd()}
              placeholder="np. Oświetlenie LED" 
              className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-1 text-sm font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
            <Button onClick={onAdd} size="icon" className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={!newCatName.trim()}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryItem({ cat, isActive, onSelect, onDelete, onStartRename, renamingId, renameValue, onSetRenameValue, onConfirmRename, onCancelRename }: any) {
  const IconComp = ICON_MAP[cat.iconName] || Folder;
  const isRenaming = renamingId === cat.id;

  return (
    <div 
      onClick={() => !isRenaming && onSelect(cat.id)}
      className={`group flex items-center justify-between p-5 cursor-pointer border-b last:border-0 transition-all duration-300 ${
        isActive ? 'bg-primary/5 border-l-[6px] border-l-primary' : 'hover:bg-muted/50 border-l-[6px] border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-4 font-bold text-sm flex-1">
        <div className={`${isActive ? 'text-primary scale-110' : 'text-slate-400'} transition-transform`}>
          <IconComp className="w-5 h-5" />
        </div>
        {isRenaming ? (
          <input
            autoFocus
            className="bg-white border-2 border-primary/20 rounded-xl px-3 py-1.5 w-full focus:ring-4 focus:ring-primary/10 outline-none"
            value={renameValue}
            onChange={(e) => onSetRenameValue(e.target.value)}
            onBlur={() => onConfirmRename(cat.id, renameValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirmRename(cat.id, renameValue);
              if (e.key === 'Escape') onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`truncate uppercase tracking-tight ${isActive ? 'text-slate-900 font-black' : 'text-slate-600'}`}>{cat.name}</span>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
        <button 
          onClick={(e) => { e.stopPropagation(); onStartRename(cat.id, cat.name); }}
          className="btn-action-blue !w-8 !h-8 !rounded-xl"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
          className="btn-action-red !w-8 !h-8 !rounded-xl"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className={`w-4 h-4 transition-transform ml-1 ${isActive ? 'text-primary translate-x-1' : 'text-slate-300'}`} />
      </div>
    </div>
  );
}
