"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  isRepairTerminalStatus,
  REPAIR_STATUSES,
} from "@/lib/repairLifecycle"
import { deleteRepairAction, updateStatusAction } from "../_actions"
import type { AdminRma } from "../RepairsDashboardClient"

export function RmaTableRow({ rma }: { rma: AdminRma }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const changeStatus = async (status: string) => {
    setBusy(true)
    try {
      const result = await updateStatusAction(rma.id, status)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Nie udało się zmienić statusu zgłoszenia.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Usunąć zgłoszenie ${rma.id}?`)) return
    setBusy(true)
    try {
      const result = await deleteRepairAction(rma.id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Nie udało się usunąć zgłoszenia.")
    } finally {
      setBusy(false)
    }
  }

  const terminal = isRepairTerminalStatus(rma.status)

  return (
    <TableRow>
      <TableCell className="pl-6 font-mono text-xs font-bold">{rma.id}</TableCell>
      <TableCell>
        <strong className="block">{rma.item}</strong>
        <span className="mt-1 block text-xs text-muted-foreground">S/N {rma.serial}</span>
      </TableCell>
      <TableCell>
        <span className="font-semibold">{rma.client}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {new Date(rma.date).toLocaleDateString("pl-PL")}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{rma.status}</Badge>
      </TableCell>
      <TableCell className="pr-6 text-right">
        <div className="inline-flex items-center gap-2">
          <select
            value={rma.status}
            disabled={busy || terminal}
            onChange={(event) => void changeStatus(event.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
          >
            {!REPAIR_STATUSES.includes(rma.status as (typeof REPAIR_STATUSES)[number]) && (
              <option value={rma.status}>{rma.status}</option>
            )}
            {REPAIR_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-500/10 disabled:opacity-40"
            aria-label="Usuń zgłoszenie"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  )
}
