// src/app/admin/repairs/_components/RmaTableRow.tsx
"use client";

import { useTransition } from "react";
import { Search, Wrench, CheckCircle, Package, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { updateStatusAction, deleteRepairAction } from "../_actions";
import { toast } from "sonner";

interface IRepair {
  id: string;
  client: string;
  item: string;
  serial: string;
  date: string;
  status: string;
}

export function RmaTableRow({ r }: { r: IRepair }) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    if (isPending) return;
    startTransition(async () => {
      const result = await updateStatusAction(r.id, newStatus);
      if (!result.success) toast.error(result.error);
      else toast.success(`Zaktualizowano status: ${newStatus}`);
    });
  };

  const handleDelete = () => {
    if (!confirm("Usunąć to zgłoszenie?")) return;
    startTransition(async () => {
      const result = await deleteRepairAction(r.id);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  return (
    <TableRow className="group hover:bg-primary/5 transition-all duration-300">
       <TableCell className="py-8 pl-10">
          <div className="flex flex-col">
             <span className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{r.client}</span>
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">B2B Partner</span>
          </div>
       </TableCell>
       <TableCell className="py-8">
          <Badge variant="outline" className="font-mono text-[10px] font-black tracking-widest bg-slate-100/50 border-slate-200">
             {r.id}
          </Badge>
       </TableCell>
       <TableCell className="py-8">
          <div className="flex flex-col">
             <span className="font-bold text-slate-700 leading-none mb-1">{r.item}</span>
             <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">S/N: {r.serial}</span>
          </div>
       </TableCell>
       <TableCell className="py-8">
          <span className="text-xs font-bold text-slate-500">{r.date}</span>
       </TableCell>
       <TableCell className="py-8">
         <StatusBadge status={r.status} />
       </TableCell>
       <TableCell className="py-8 text-right pr-10">
         <div className={`flex items-center justify-end gap-2 transition-all duration-300 ${isPending ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
           <ActionStrip currentStatus={r.status} onStatusChange={handleStatusChange} />
           <div className="w-px h-6 bg-slate-200 mx-1"></div>
           <button className="btn-action-blue !w-10 !h-10 !rounded-2xl" title="Edytuj zgłoszenie">
             <Pencil className="h-5 w-5" />
           </button>
           <button onClick={handleDelete} className="btn-action-red !w-10 !h-10 !rounded-2xl" title="Usuń zgłoszenie">
             <Trash2 className="h-5 w-5" />
           </button>
         </div>
       </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "ZAKOŃCZONE";
  const variant = isDone ? "outline" : (status === "W NAPRAWIE" ? "default" : "destructive");
  return (
    <Badge variant={variant} 
           className={`rounded-xl px-4 py-1.5 font-black text-[9px] uppercase tracking-widest ${isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}`}>
      {status}
    </Badge>
  );
}

function ActionStrip({ currentStatus, onStatusChange }: { currentStatus: string, onStatusChange: (s: string) => void }) {
  const actions = [
    { id: 'WERYFIKACJA', icon: Search, color: 'text-blue-600', bg: 'bg-blue-100/80', border: 'border-blue-200', label: 'WERYFIKACJA' },
    { id: 'W NAPRAWIE', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100/80', border: 'border-amber-200', label: 'SERWIS' },
    { id: 'ZAKOŃCZONE', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100/80', border: 'border-emerald-200', label: 'GOTOWE' },
    { id: 'ODRZUCONE', icon: Package, color: 'text-red-600', bg: 'bg-red-100/80', border: 'border-red-200', label: 'ODRZUĆ' }
  ];

  return (
    <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 backdrop-blur-sm gap-1 ml-4 shadow-inner">
      {actions.map((act) => {
        const isActive = currentStatus === act.id;
        return (
          <button
            key={act.id}
            onClick={() => onStatusChange(act.id)}
            className={`h-8 px-3 flex items-center justify-center gap-2 rounded-xl transition-all duration-300 ${isActive ? `${act.bg} ${act.color} ${act.border} border shadow-sm scale-105 z-10 font-bold` : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
          >
            <act.icon className={`w-3.5 h-3.5 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[9px] font-black tracking-tighter uppercase">{act.label}</span>
          </button>
        );
      })}
    </div>
  );
}
