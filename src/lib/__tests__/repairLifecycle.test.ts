import { describe, expect, it } from "vitest"
import {
  canDeleteRepair,
  isRepairStatus,
  isRepairTerminalStatus,
  validateRepairStatusTransition,
} from "@/lib/repairLifecycle"

describe("repair lifecycle", () => {
  it("recognizes only canonical admin statuses", () => {
    expect(isRepairStatus("WERYFIKACJA")).toBe(true)
    expect(isRepairStatus("RETURNED")).toBe(true)
    expect(isRepairStatus("DROP TABLE repairs")).toBe(false)
  })

  it("allows canonical updates while a repair is active", () => {
    expect(
      validateRepairStatusTransition("WERYFIKACJA", "DIAGNOSIS")
    ).toBe("ok")
    expect(
      validateRepairStatusTransition("DIAGNOSIS", "COMPLETED")
    ).toBe("ok")
  })

  it("keeps terminal statuses terminal while allowing idempotent retries", () => {
    expect(
      validateRepairStatusTransition("RETURNED", "RETURNED")
    ).toBe("ok")
    expect(
      validateRepairStatusTransition("REJECTED", "REJECTED")
    ).toBe("ok")
    expect(
      validateRepairStatusTransition("RETURNED", "REPAIRING")
    ).toBe("terminal-status")
    expect(
      validateRepairStatusTransition("REJECTED", "WERYFIKACJA")
    ).toBe("terminal-status")
  })

  it("rejects arbitrary next statuses", () => {
    expect(
      validateRepairStatusTransition("WERYFIKACJA", "HACKED")
    ).toBe("invalid-status")
  })


  it("uses returned and rejected as the only terminal RMA states", () => {
    expect(isRepairTerminalStatus("RETURNED")).toBe(true)
    expect(isRepairTerminalStatus("REJECTED")).toBe(true)
    expect(isRepairTerminalStatus("COMPLETED")).toBe(false)
    expect(isRepairTerminalStatus("DONE")).toBe(false)
    expect(isRepairTerminalStatus(undefined)).toBe(false)
  })

  it("allows permanent deletion only before service handling starts", () => {
    expect(canDeleteRepair("WERYFIKACJA")).toBe(true)

    for (const status of [
      "DIAGNOSIS",
      "REPAIRING",
      "COMPLETED",
      "RETURNED",
      "REJECTED",
      "UNKNOWN",
      undefined,
    ]) {
      expect(canDeleteRepair(status)).toBe(false)
    }
  })
})
