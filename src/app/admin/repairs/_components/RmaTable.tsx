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
        <TableHeader className="bg-slate-50 border-y border-slate-100">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pl-6 w-16 italic">ID</TableHead>
            <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 italic">Specyfikacja_Sprzętu</TableHead>
            <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 italic">Partner_B2B</TableHead>
            <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 px-6 italic">Status_Naprawy</TableHead>
            <TableHead className="text-[10px] font-black text-slate-950 uppercase tracking-widest py-4 pr-6 text-right italic">Działania</TableHead>
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
