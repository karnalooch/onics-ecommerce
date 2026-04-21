"use client";

import { 
  Folder, Edit2, Trash2, ChevronRight, Plus,
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic,
  Terminal, ShieldCheck
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Activity, Wrench, Home, Speaker, Mic, Folder
};

export function CategoryList({ 
  categories, activeCatId, onSelect, onAdd, onDelete, onStartRename, 
  renamingId, renameValue, onSetRenameValue, onConfirmRename, onCancelRename,
  newCatName, onNewCatNameChange
}: any) {
  return (
    <div className="satel-card p-0 bg-white border-none shadow-sm overflow-hidden rounded-none flex flex-col h-full min-h-[700px]">
      <div className="bg-slate-950 px-8 py-5 border-b border-white/5">
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">REJESTR_WĘZŁÓW_GŁÓWNYCH</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
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

      <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-3">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Inicjuj Nowy Węzeł</label>
        <div className="flex gap-2">
          <div className="relative flex-1 group">
             <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200 group-focus-within:text-primary transition-colors" />
             <input 
               type="text" 
               value={newCatName}
               onChange={e => onNewCatNameChange(e.target.value)}
               onKeyDown={e => e.key === 'Enter' && onAdd()}
               placeholder="IDENTYFIKATOR_TEKSTOWY..." 
               className="w-full h-12 pl-12 bg-white border border-slate-200 px-4 text-[12px] font-black uppercase italic outline-none focus:border-primary transition-all shadow-sm"
             />
          </div>
          <button 
             onClick={onAdd} 
             disabled={!newCatName.trim()}
             className="h-12 w-12 bg-slate-950 text-white flex items-center justify-center hover:bg-primary transition-all active-press shadow-xl shadow-primary/10 disabled:opacity-20"
          >
            <Plus className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryItem({ cat, isActive, onSelect, onDelete, onStartRename, renamingId, renameValue, onSetRenameValue, onConfirmRename, onCancelRename }: any) {
  const IconComp = ICON_MAP[cat.iconName] || Folder;
  const isRenaming = renamingId === cat.id;

  return (
    <div 
      onClick={() => !isRenaming && onSelect(cat.id)}
      className={`group flex items-center justify-between p-6 cursor-pointer border-l-4 transition-all ${
        isActive ? 'bg-slate-50 border-primary' : 'bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-100'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`transition-all ${isActive ? 'text-primary' : 'text-slate-300'}`}>
          <IconComp className="w-5 h-5" />
        </div>
        {isRenaming ? (
          <input
            autoFocus
            className="w-full h-9 bg-white border border-primary px-3 text-[12px] font-black uppercase italic outline-none shadow-inner"
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
          <div className="flex flex-col min-w-0">
             <span className={`text-[13px] font-black uppercase italic truncate leading-none ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                {cat.name}
             </span>
             {isActive && <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-1">NODE_SELECTED</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
        <button 
          onClick={(e) => { e.stopPropagation(); onStartRename(cat.id, cat.name); }}
          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-primary transition-all active-press"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
          className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-red-600 transition-all active-press"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className={`w-4 h-4 transition-transform ml-2 ${isActive ? 'text-primary translate-x-1' : 'text-slate-200'}`} />
      </div>
    </div>
  );
}
