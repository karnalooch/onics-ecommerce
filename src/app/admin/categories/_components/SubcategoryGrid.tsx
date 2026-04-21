"use client";

import { Edit2, Trash2, Layers, AlertCircle } from "lucide-react";

interface ISubcategory {
  id: string;
  name: string;
}

interface ISubcategoryGridProps {
  subcategories: ISubcategory[];
  renamingId: string | null;
  renameValue: string;
  onStartRename: (id: string, name: string) => void;
  onSetRenameValue: (val: string) => void;
  onConfirmRename: (id: string, name: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
}

export function SubcategoryGrid({ 
  subcategories, renamingId, renameValue, 
  onStartRename, onSetRenameValue, onConfirmRename, onCancelRename, onDelete 
}: ISubcategoryGridProps) {
  if (!subcategories || subcategories.length === 0) {
    return (
      <div className="col-span-full py-20 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-20">
         <Layers className="w-10 h-10 mb-4" />
         <span className="text-[10px] font-black uppercase tracking-[0.4em] italic text-center">Brak_Zdefiniowanych_Gałęzi</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {subcategories.map((sub) => {
        const isRenaming = renamingId === sub.id;
        return (
          <div 
            key={sub.id} 
            className={`group flex items-center justify-between p-4 bg-white border h-16 transition-all ${
              isRenaming ? 'border-primary shadow-lg shadow-primary/5' : 'border-slate-100 hover:border-slate-950/20'
            }`}
          >
             <div className="flex-1 mr-4 min-w-0">
                {isRenaming ? (
                  <input
                    autoFocus
                    className="w-full h-9 bg-slate-50 border border-primary px-3 text-[12px] font-black uppercase italic outline-none shadow-inner"
                    value={renameValue}
                    onChange={(e) => onSetRenameValue(e.target.value)}
                    onBlur={() => onConfirmRename(sub.id, renameValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onConfirmRename(sub.id, renameValue);
                      if (e.key === 'Escape') onCancelRename();
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-6 bg-slate-50 group-hover:bg-primary transition-colors" />
                     <span className="text-[13px] font-black text-slate-950 uppercase italic truncate leading-none">{sub.name}</span>
                  </div>
                )}
             </div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button 
                   onClick={() => onStartRename(sub.id, sub.name)}
                   className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-primary transition-all active-press"
                >
                   <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                   onClick={() => onDelete(sub.id)}
                   className="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 text-slate-300 hover:text-red-600 transition-all active-press"
                >
                   <Trash2 className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
        )
      })}
    </div>
  );
}
