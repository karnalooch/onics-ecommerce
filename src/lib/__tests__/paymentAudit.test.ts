import { describe, expect, it, vi } from "vitest"
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
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001"
    )
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

    expect(entry).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-09-26T10:00:00.000Z",
      target: "STRIPE",
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
    expect(entries).toHaveLength(1)

    vi.restoreAllMocks()
  })

  it("keeps at most 100 newest entries", () => {
    const entries: PaymentAuditEntry[] = Array.from(
      { length: 100 },
      (_, index) => ({
        id: `old-${index}`,
        createdAt: "2026-09-26T09:00:00.000Z",
        target: "GLOBAL" as const,
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
