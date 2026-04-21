"use client";

import { 
  Tv, Smartphone, Video, Network, Shield, Cpu, Zap, Wrench, Home, Activity, Speaker, Mic, X, Folder,
  Terminal, ShieldCheck
} from "lucide-react";

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
    <div className="mb-10 p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-none animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
           <Terminal className="w-4 h-4 text-primary" />
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 italic leading-none">Paleta_Identyfikatorów_Węzła</h4>
        </div>
        <button 
           onClick={onClose} 
           className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors active-press"
        >
           <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-4">
        {AVAILABLE_ICONS.map(icon => (
          <button
            key={icon.name}
            onClick={() => onSelect(icon.name)}
            className={`h-16 flex items-center justify-center transition-all border-2 active-press relative group ${
              currentIcon === icon.name 
                ? 'bg-slate-950 border-slate-950 text-primary shadow-xl shadow-primary/5' 
                : 'bg-white border-slate-100 text-slate-300 hover:border-primary hover:text-primary'
            }`}
          >
            <icon.Icon className="w-6 h-6" />
            {currentIcon === icon.name && (
               <div className="absolute -top-1 -right-1">
                  <ShieldCheck className="w-3 h-3 text-primary bg-slate-950" />
               </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
