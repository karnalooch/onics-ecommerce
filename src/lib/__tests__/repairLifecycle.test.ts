import { describe, expect, it } from "vitest"
import {
  canDeleteRepair,
  isRepairStatus,
  validateRepairStatusTransition,
  validateRepairStatusWrite,
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

  it("fences stale status writers while preserving exact retries", () => {
    expect(
      validateRepairStatusWrite(
        "WERYFIKACJA",
        "WERYFIKACJA",
        "DIAGNOSIS"
      )
    ).toBe("apply")

    expect(
      validateRepairStatusWrite(
        "DIAGNOSIS",
        "WERYFIKACJA",
        "REPAIRING"
      )
    ).toBe("conflict")

    expect(
      validateRepairStatusWrite(
        "DIAGNOSIS",
        "WERYFIKACJA",
        "DIAGNOSIS"
      )
    ).toBe("replay")
  })

  it("keeps terminal and invalid transitions protected under status fencing", () => {
    expect(
      validateRepairStatusWrite("RETURNED", "RETURNED", "REPAIRING")
    ).toBe("terminal-status")
    expect(
      validateRepairStatusWrite("WERYFIKACJA", "WERYFIKACJA", "HACKED")
    ).toBe("invalid-status")
    expect(
      validateRepairStatusWrite("RETURNED", "DIAGNOSIS", "RETURNED")
    ).toBe("replay")
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
