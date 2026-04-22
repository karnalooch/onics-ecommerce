"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RmaTableRow } from "./RmaTableRow";

interface IRmaTableProps {
  rmas: any[];
  onUpdate: (rmas: any[]) => void;
}

export function RmaTable({ rmas, onUpdate }: IRmaTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="border-collapse">
        <TableHeader className="bg-primary/5 border-b border-black/5 dark:border-white/10">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-6 pl-8 w-24">Log_ID</TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-6 px-6">Specyfikacja Urządzenia</TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-6 px-6">Partner B2B</TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-6 px-6">Status Naprawy</TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest py-6 pr-8 text-right">Zarządzanie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rmas.map((rma) => (
            <RmaTableRow 
              key={rma.id} 
              rma={rma} 
              onUpdate={() => {
                // Simplified refresh logic
              }} 
            />
          ))}
          {rmas.length === 0 && (
             <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-[11px] font-black text-slate-200 uppercase tracking-[0.5em] italic">
                   Brak_Aktywnych_Zgłoszeń
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
