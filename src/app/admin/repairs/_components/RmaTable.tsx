// src/app/admin/repairs/_components/RmaTable.tsx
"use client";

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Package, Clock } from "lucide-react";
import { RmaTableRow } from "./RmaTableRow";

interface IRepair {
  id: string;
  client: string;
  item: string;
  serial: string;
  date: string;
  status: string;
}

export function RmaTable({ repairs }: { repairs: IRepair[] }) {
  return (
    <div className="bg-card border border-border rounded-[3rem] shadow-sm overflow-hidden min-h-[500px]">
       <div className="p-10 border-b flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-4">
             <Clock className="w-5 h-5 text-primary" />
             <h3 className="text-xl font-black uppercase tracking-tight">Aktywna Kolejka <span className="text-primary italic">Zadań</span></h3>
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-border">
             LIVE SYNC: {new Date().toLocaleTimeString()}
          </div>
       </div>
       
       <Table>
         <TableHeader className="bg-slate-50 border-b">
           <TableRow className="hover:bg-transparent">
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest pl-10">Klient / Firma</TableHead>
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">ID RMA</TableHead>
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Urządzenie</TableHead>
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Wpłynęło</TableHead>
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
             <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest text-right pr-10">Zarządzaj</TableHead>
           </TableRow>
         </TableHeader>
         <TableBody>
           {repairs.map(r => (
             <RmaTableRow key={r.id} r={r} />
           ))}
           
           {repairs.length === 0 && (
              <TableRow>
                 <TableCell colSpan={6} className="py-40 text-center">
                    <Package className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                    <h4 className="text-xl font-black text-slate-300 uppercase italic">Brak zgłoszeń</h4>
                 </TableCell>
              </TableRow>
           )}
         </TableBody>
       </Table>
    </div>
  );
}
