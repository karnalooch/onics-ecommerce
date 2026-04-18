// src/app/admin/categories/_components/IconPicker.tsx
"use client";

import { 
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Wrench, Home, Activity, Speaker, Mic, X, Folder
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_ICONS = [
  { name: "Tv", Icon: Tv },
  { name: "Smartphone", Icon: Smartphone },
  { name: "Video", Icon: Video },
  { name: "Network", Icon: Network },
  { name: "Shield", Icon: Shield },
  { name: "Cpu", Icon: Cpu },
  { name: "Zap", Icon: Zap },
  { name: "Activity", Icon: Activity },
  { name: "Wrench", Icon: Wrench },
  { name: "Home", Icon: Home },
  { name: "Speaker", Icon: Speaker },
  { name: "Mic", Icon: Mic },
  { name: "Folder", Icon: Folder }
];

interface IIconPickerProps {
  currentIcon: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function IconPicker({ currentIcon, onSelect, onClose }: IIconPickerProps) {
  return (
    <div className="mb-8 p-6 bg-muted/30 border-2 border-dashed border-primary/10 rounded-3xl animate-in zoom-in-95 duration-200 shadow-inner">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Paleta Ikon Kategorii</h4>
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl"><X className="w-4 h-4" /></Button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-3">
        {AVAILABLE_ICONS.map(icon => (
          <button
            key={icon.name}
            onClick={() => onSelect(icon.name)}
            className={`p-4 rounded-2xl border-2 flex items-center justify-center transition-all shadow-sm ${
              currentIcon === icon.name 
                ? 'bg-primary border-primary text-white scale-110 shadow-primary/20' 
                : 'bg-white border-transparent hover:border-primary/30 hover:bg-primary/5 text-slate-400'
            }`}
          >
            <icon.Icon className="w-6 h-6" />
          </button>
        ))}
      </div>
    </div>
  );
}
