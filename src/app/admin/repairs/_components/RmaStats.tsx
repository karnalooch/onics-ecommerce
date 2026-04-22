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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((s, idx) => (
        <div key={idx} className="fluent-card p-8 border-white/10 shadow-lg flex flex-col gap-4 group transition-all hover:bg-primary/5">
          <div className="flex items-center justify-between">
            <s.icon className={`w-5 h-5 ${s.color} shadow-glow`} />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{s.label}</span>
          </div>
          <span className="text-4xl font-extrabold text-foreground tabular-nums tracking-tighter group-hover:text-primary transition-colors">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
