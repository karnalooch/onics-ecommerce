import { describe, expect, it } from "vitest"
import {
  appendPaymentAudit,
  paymentAuditChanged,
} from "@/lib/paymentAudit"
import type { PaymentAuditEntry } from "@/store/serverStore"

describe("payment settings audit", () => {
  it("does not log a no-op update", () => {
    const entries: PaymentAuditEntry[] = []

    expect(
      appendPaymentAudit(
        entries,
        { id: "admin-1", email: "admin@example.com", name: "Admin" },
        {
          target: "GLOBAL",
          previousEnabled: true,
          nextEnabled: true,
          previousMaintenanceMessage: "A",
          nextMaintenanceMessage: "A",
        }
      )
    ).toBeNull()

    expect(entries).toEqual([])
  })

  it("detects enable or maintenance-message changes", () => {
    expect(
      paymentAuditChanged({
        target: "GLOBAL",
        previousEnabled: true,
        nextEnabled: false,
      })
    ).toBe(true)

    expect(
      paymentAuditChanged({
        target: "GLOBAL",
        previousEnabled: false,
        nextEnabled: false,
        previousMaintenanceMessage: "A",
        nextMaintenanceMessage: "B",
      })
    ).toBe(true)
  })

  it("records actor and before/after values", () => {
    const entries: PaymentAuditEntry[] = []

    const entry = appendPaymentAudit(
      entries,
      { id: "admin-1", email: "admin@example.com", name: "Admin" },
      {
        target: "STRIPE",
        previousEnabled: true,
        nextEnabled: false,
      },
      "2026-09-26T10:00:00.000Z"
    )

    expect(entry).toMatchObject({
      createdAt: "2026-09-26T10:00:00.000Z",
      target: "STRIPE",
      operation: "SETTING_CHANGE",
      actor: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
      },
      previousEnabled: true,
      nextEnabled: false,
      previousMaintenanceMessage: null,
      nextMaintenanceMessage: null,
    })
    expect(entry?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(entries).toHaveLength(1)
  })

  it("logs emergency shutdown even when global state was already disabled", () => {
    const entries: PaymentAuditEntry[] = []

    const entry = appendPaymentAudit(
      entries,
      { id: "admin-1" },
      {
        target: "GLOBAL",
        operation: "EMERGENCY_SHUTDOWN",
        previousEnabled: false,
        nextEnabled: false,
        previousMaintenanceMessage: "Przerwa",
        nextMaintenanceMessage: "Przerwa",
      },
      "2026-09-26T10:30:00.000Z"
    )

    expect(entry?.operation).toBe("EMERGENCY_SHUTDOWN")
    expect(entries).toHaveLength(1)
  })

  it("keeps at most 100 newest entries", () => {
    const entries: PaymentAuditEntry[] = Array.from(
      { length: 100 },
      (_, index) => ({
        id: `old-${index}`,
        createdAt: "2026-09-26T09:00:00.000Z",
        target: "GLOBAL" as const,
        operation: "SETTING_CHANGE" as const,
        actor: { id: null, email: null, name: null },
        previousEnabled: true,
        nextEnabled: false,
        previousMaintenanceMessage: null,
        nextMaintenanceMessage: null,
      })
    )

    appendPaymentAudit(
      entries,
      { id: "admin-1" },
      {
        target: "GLOBAL",
        previousEnabled: false,
        nextEnabled: true,
      },
      "2026-09-26T10:00:00.000Z"
    )

    expect(entries).toHaveLength(100)
    expect(entries[0].createdAt).toBe("2026-09-26T10:00:00.000Z")
    expect(entries.some((entry) => entry.id === "old-99")).toBe(false)
  })
})
