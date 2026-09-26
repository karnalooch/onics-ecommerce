export const REPAIR_STATUSES = [
  "WERYFIKACJA",
  "DIAGNOSIS",
  "REPAIRING",
  "COMPLETED",
  "RETURNED",
  "REJECTED",
] as const

export type RepairStatus = (typeof REPAIR_STATUSES)[number]
export type RepairStatusTransitionResult =
  | "ok"
  | "invalid-status"
  | "terminal-status"

const TERMINAL_REPAIR_STATUSES = new Set<string>([
  "RETURNED",
  "REJECTED",
])

export function isRepairStatus(value: unknown): value is RepairStatus {
  return REPAIR_STATUSES.includes(value as RepairStatus)
}

export function isRepairTerminalStatus(value: unknown) {
  return TERMINAL_REPAIR_STATUSES.has(String(value ?? ""))
}

export function validateRepairStatusTransition(
  currentStatus: unknown,
  nextStatus: unknown
): RepairStatusTransitionResult {
  if (!isRepairStatus(nextStatus)) return "invalid-status"
  if (currentStatus === nextStatus) return "ok"
  if (isRepairTerminalStatus(currentStatus)) {
    return "terminal-status"
  }
  return "ok"
}
