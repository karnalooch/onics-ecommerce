"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RmaTableRow } from "./RmaTableRow"
import type { AdminRma } from "../RepairsDashboardClient"

export function RmaTable({ rmas }: { rmas: AdminRma[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">RMA</TableHead>
            <TableHead>Urządzenie</TableHead>
            <TableHead>Partner / klient</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-6 text-right">Zarządzanie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rmas.map((rma) => (
            <RmaTableRow key={rma.id} rma={rma} />
          ))}
          {rmas.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-40 text-center text-sm text-muted-foreground">
                Brak zgłoszeń spełniających kryteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
