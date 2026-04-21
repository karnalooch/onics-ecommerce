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
  PENDING: { label: "OCZEKUJE", color: "bg-slate-100 text-slate-500", icon: Clock },
  DIAGNOSIS: { label: "DIAGNOSTYKA", color: "bg-primary/10 text-primary", icon: AlertTriangle },
  REPAIRING: { label: "W_NAPRAWIE", color: "bg-orange-50 text-orange-600", icon: Wrench },
  COMPLETED: { label: "ZAKOŃCZONO", color: "bg-status-success/10 text-status-success", icon: CheckCircle2 },
  RETURNED: { label: "ZWRÓCONO", color: "bg-slate-900 text-white", icon: ChevronRight },
  REJECTED: { label: "ODRZUCONO", color: "bg-status-error/10 text-status-error", icon: XCircle },
};

export function RmaTableRow({ rma, onUpdate }: { rma: any, onUpdate: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const status = statusConfig[rma.status] || statusConfig.PENDING;

  return (
    <TableRow className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <TableCell className="py-6 pl-6">
        <span className="text-[11px] font-black text-slate-400 italic">#{rma.id.toString().padStart(4, '0')}</span>
      </TableCell>
      
      <TableCell className="px-6">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-black text-slate-950 uppercase italic tracking-tighter leading-none">{rma.deviceModel || "URZĄDZENIE_TECH"}</span>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">{rma.serialNumber}</span>
             <div className="h-2 w-[1px] bg-slate-200" />
             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">{rma.type || "GWARANCJA_STANDARD"}</span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-6">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-950 uppercase leading-none">{rma.clientName || "PARYNER_B2B"}</span>
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest tabular-nums italic">NIP: 000-00-00-000</span>
        </div>
      </TableCell>

      <TableCell className="px-6">
        <div className={`inline-flex items-center gap-2 px-3 py-1 ${status.color} border border-current/10`}>
          <status.icon className="w-3 h-3" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em] italic">{status.label}</span>
        </div>
      </TableCell>

      <TableCell className="py-6 pr-6 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
           <button className="h-8 w-8 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-primary transition-all active-press">
              <FileText className="w-4 h-4" />
           </button>
           <button className="h-8 px-4 bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-primary active-press italic">
              ZARZĄDZAJ <ChevronRight className="w-3 h-3" />
           </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
