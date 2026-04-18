// src/app/admin/categories/_components/SubcategoryGrid.tsx
"use client";

import { Edit2, Trash2 } from "lucide-react";

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
      <div className="col-span-full text-xs font-black text-slate-400 p-10 border-2 border-dashed rounded-3xl text-center bg-slate-50 uppercase tracking-widest">
        Brak aktywnych gałęzi w tym wydziale.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subcategories.map((sub) => (
        <div key={sub.id} className="group flex items-center justify-between p-4 rounded-3xl border border-slate-200 bg-white hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 h-16">
           <div className="flex-1 mr-4">
              {renamingId === sub.id ? (
                <input
                  autoFocus
                  className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 w-full outline-none text-sm font-bold"
                  value={renameValue}
                  onChange={(e) => onSetRenameValue(e.target.value)}
                  onBlur={() => onConfirmRename(sub.id, renameValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirmRename(sub.id, renameValue);
                    if (e.key === 'Escape') onCancelRename();
                  }}
                />
              ) : (
                <span className="font-bold text-sm truncate block text-slate-700">{sub.name}</span>
              )}
           </div>
           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                 onClick={() => onStartRename(sub.id, sub.name)}
                 className="btn-action-blue !w-8 !h-8 !rounded-xl"
              >
                 <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                 onClick={() => onDelete(sub.id)}
                 className="btn-action-red !w-8 !h-8 !rounded-xl"
              >
                 <Trash2 className="w-3.5 h-3.5" />
              </button>
           </div>
        </div>
      ))}
    </div>
  );
}
