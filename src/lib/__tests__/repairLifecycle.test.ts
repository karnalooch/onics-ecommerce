import { describe, expect, it } from "vitest"
import {
  isRepairStatus,
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
})
