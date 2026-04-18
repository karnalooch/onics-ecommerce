// src/app/admin/repairs/_components/RmaStats.tsx
import { Package, Activity, CheckCircle } from "lucide-react";

interface IStats {
  total: number;
  active: number;
  completed: number;
}

export function RmaStats({ stats }: { stats: IStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard 
        label="Wszystkie zgłoszenia" 
        value={stats.total} 
        icon={Package} 
        color="primary" 
      />
      <StatCard 
        label="Aktywne naprawy" 
        value={stats.active} 
        icon={Activity} 
        color="amber" 
      />
      <StatCard 
        label="Zrealizowane (DONE)" 
        value={stats.completed} 
        icon={CheckCircle} 
        color="emerald" 
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/5 text-primary bg-primary/10",
    amber: "bg-amber-500/5 text-amber-600 bg-amber-500/10",
    emerald: "bg-emerald-500/5 text-emerald-600 bg-emerald-500/10"
  };

  const ringColor = color === 'primary' ? 'bg-primary/5' : `bg-${color}-500/5`;
  const iconBg = color === 'primary' ? 'bg-primary/10' : `bg-${color}-500/10`;
  const textCol = color === 'primary' ? 'text-primary' : color === 'amber' ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="bg-card border border-border rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${ringColor} rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700`}></div>
      <div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <h3 className={`text-4xl font-black ${textCol}`}>{value}</h3>
      </div>
      <div className={`${iconBg} p-4 rounded-3xl`}>
        <Icon className={`w-8 h-8 ${textCol}`} />
      </div>
    </div>
  );
}
