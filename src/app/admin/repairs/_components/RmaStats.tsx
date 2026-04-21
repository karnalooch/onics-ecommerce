"use client";

import { Activity, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export function RmaStats({ rmas }: { rmas: any[] }) {
  const pending = rmas.filter(r => r.status === "PENDING").length;
  const inProgress = rmas.filter(r => ["DIAGNOSIS", "REPAIRING"].includes(r.status)).length;
  const completed = rmas.filter(r => r.status === "COMPLETED").length;

  const stats = [
    { label: "W_KOLEJCE", value: pending, icon: Clock, color: "text-slate-400" },
    { label: "W_SERWISIE", value: inProgress, icon: Activity, color: "text-primary" },
    { label: "ZAKOŃCZONE", value: completed, icon: CheckCircle2, color: "text-status-success" },
    { label: "TOTAL_RMA", value: rmas.length, icon: ShieldAlert, color: "text-slate-950" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, idx) => (
        <div key={idx} className="satel-card p-6 bg-white border-none shadow-sm flex flex-col gap-2 group transition-all hover:border-primary">
          <div className="flex items-center justify-between">
            <s.icon className={`w-4 h-4 ${s.color}`} />
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none italic">{s.label}</span>
          </div>
          <span className="text-3xl font-black text-slate-950 tabular-nums italic group-hover:text-primary transition-colors">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
