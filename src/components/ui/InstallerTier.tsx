"use client";

import { Award, ChevronRight, TrendingUp } from "lucide-react";

interface InstallerTierProps {
  currentLevel: string;
  points: number;
  nextLevelPoints: number;
  discount: number;
}

export function InstallerTier({ currentLevel, points, nextLevelPoints, discount }: InstallerTierProps) {
  const progress = Math.min((points / nextLevelPoints) * 100, 100);

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
      {/* Decorative background element */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-50 rounded-full blur-3xl group-hover:bg-blue-100 transition-colors duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Twój Status Partnera</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Poziom: {currentLevel}</h2>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
            <span className="text-xs font-bold text-emerald-600 uppercase block leading-tight">Stały Rabat</span>
            <span className="text-2xl font-black text-emerald-700">-{discount}%</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between text-sm">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium">Postęp do kolejnego progu</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">{points.toLocaleString()} / {nextLevelPoints.toLocaleString()} PLN</span>
              </div>
            </div>
            <span className="text-blue-600 font-black">{Math.round(progress)}%</span>
          </div>

          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200/50">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-4">
            Brakuje Ci <strong className="text-slate-900">{(nextLevelPoints - points).toLocaleString()} PLN</strong> obrotu netto, aby odblokować poziom <span className="text-indigo-600 font-bold">GOLD (-20%)</span>.
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>
    </div>
  );
}
