import { describe, expect, it } from "vitest"
import {
  buildAdminOrderStateToken,
  isAdminOrderUpdateReplay,
} from "@/lib/orderAdminState"

const items = [
  {
    id: "p1",
    sku: "SKU-1",
    name: "Produkt",
    quantity: 2,
    price: 99.5,
  },
]

describe("admin order state fencing", () => {
  it("builds a stable token independent of object key insertion order", () => {
    const first = {
      id: "ORD-1",
      status: "PENDING_VERIFICATION",
      paymentStatus: "PENDING",
      inventory: { status: "RESERVED", source: "ORDER" },
      items,
    }
    const second = {
      items: items.map((item) => ({ ...item })),
      inventory: { source: "ORDER", status: "RESERVED" },
      paymentStatus: "PENDING",
      status: "PENDING_VERIFICATION",
      id: "ORD-1",
    }

    expect(buildAdminOrderStateToken(first)).toBe(
      buildAdminOrderStateToken(second)
    )
    expect(buildAdminOrderStateToken(first)).toMatch(/^[a-f0-9]{64}$/)
  })

  it("changes the token for payment, inventory, status, ETA, or item changes", () => {
    const current = {
      id: "ORD-1",
      status: "PENDING_VERIFICATION",
      paymentStatus: "PENDING",
      inventoryReservationStatus: "RESERVED",
      estimatedDeliveryDays: 5,
      items,
    }
    const token = buildAdminOrderStateToken(current)

    for (const changed of [
      { ...current, status: "CONFIRMED" },
      { ...current, paymentStatus: "PAID" },
      { ...current, inventoryReservationStatus: "FINALIZED" },
      { ...current, estimatedDeliveryDays: 7 },
      { ...current, items: [{ ...items[0], quantity: 3 }] },
    ]) {
      expect(buildAdminOrderStateToken(changed)).not.toBe(token)
    }
  })

  it("recognizes exact retries without accepting divergent stale snapshots", () => {
    const current = {
      status: "CONFIRMED",
      estimatedDeliveryDays: 5,
      items,
    }

    expect(
      isAdminOrderUpdateReplay(current, {
        status: "CONFIRMED",
        estimatedDeliveryDays: 5,
        items: items.map((item) => ({ ...item })),
      })
    ).toBe(true)

    expect(
      isAdminOrderUpdateReplay(current, {
        status: "CONFIRMED",
      })
    ).toBe(true)

    expect(
      isAdminOrderUpdateReplay(current, {
        status: "SHIPPED",
        estimatedDeliveryDays: 5,
        items,
      })
    ).toBe(false)

    expect(
      isAdminOrderUpdateReplay(current, {
        status: "CONFIRMED",
        estimatedDeliveryDays: 7,
        items,
      })
    ).toBe(false)
  })
})
