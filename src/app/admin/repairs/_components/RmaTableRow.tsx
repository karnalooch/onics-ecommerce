"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  ChevronRight, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  XCircle,
  FileText,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";

const statusConfig: any = {
  PENDING: { label: "Oczekiwanie", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  DIAGNOSIS: { label: "Diagnostyka", color: "bg-primary/10 text-primary border-primary/20", icon: AlertTriangle },
  REPAIRING: { label: "W Naprawie", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Wrench },
  COMPLETED: { label: "Zakończono", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  RETURNED: { label: "Zwrócono", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: ChevronRight },
  REJECTED: { label: "Odrzucono", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
};

export function RmaTableRow({ rma, onUpdate }: { rma: any, onUpdate: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const status = statusConfig[rma.status] || statusConfig.PENDING;

  return (
    <TableRow className="group border-b border-black/5 dark:border-white/5 hover:bg-primary/5 transition-all">
      <TableCell className="py-8 pl-8">
        <Badge variant="outline" className="text-[12px] font-mono font-bold text-muted-foreground border-black/5 dark:border-white/10 px-3 tracking-tighter">
           #{rma.id.toString().padStart(4, '0')}
        </Badge>
      </TableCell>
      
      <TableCell className="px-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] font-extrabold text-foreground tracking-tight leading-none uppercase italic">{rma.deviceModel || "Sprzęt Serwisowy"}</span>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono opacity-60">{rma.serialNumber}</span>
             <div className="h-1 w-1 bg-black/10 dark:bg-white/10 rounded-full" />
             <span className="text-[10px] font-bold text-primary uppercase tracking-widest italic">{rma.type || "Gwarancja Standard"}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-6">
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-foreground leading-none">{rma.clientName || "Partner B2B"}</span>
          <span className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest tabular-nums opacity-60">NIP ID: 000-00-00-000</span>
        </div>
      </TableCell>

      <TableCell className="px-6">
        <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border ${status.color} shadow-sm`}>
          <status.icon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-widest">{status.label}</span>
        </div>
      </TableCell>

      <TableCell className="py-8 pr-8 text-right">
        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
           <button className="h-10 w-10 flex items-center justify-center bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-primary transition-all active:scale-90 rounded-xl">
              <FileText className="w-5 h-5" />
           </button>
           <button className="h-10 px-6 bg-primary text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20 rounded-xl">
              ZARZĄDZAJ <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
