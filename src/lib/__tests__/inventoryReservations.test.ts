import { describe, expect, it } from "vitest"
import {
  adjustInventoryReservation,
  applyOrderInventoryTransition,
  applyStripeInventoryTransition,
  applyStripeRefundInventory,
  hasActiveReservationForProduct,
  hasInventoryLifecycleDependencyForProduct,
  releaseInventory,
  reserveInventory,
  shouldDeferProductStockWrite,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"

describe("inventory reservations", () => {
  it("reserves aggregate quantities and rejects oversell without partial mutation", () => {
    const products = [
      { id: "p1", sku: "A", stock: 5 },
      { id: "p2", sku: "B", stock: 2 },
    ]

    reserveInventory(products, [
      { id: "p1", quantity: 2 },
      { id: "p1", quantity: 1 },
    ])
    expect(products[0].stock).toBe(2)

    expect(() =>
      reserveInventory(products, [
        { id: "p1", quantity: 1 },
        { id: "p2", quantity: 3 },
      ])
    ).toThrow("INVENTORY_NOT_AVAILABLE")

    expect(products).toEqual([
      { id: "p1", sku: "A", stock: 2 },
      { id: "p2", sku: "B", stock: 2 },
    ])
  })

  it("releases a reservation exactly once", () => {
    const products = [{ id: "p1", stock: 2 }]
    const order = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationStatus: "RESERVED" as const,
      inventoryReservedAt: "2026-09-26T00:00:00.000Z",
    }

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "EXPIRED",
        "EXPIRED",
        "2026-09-26T01:00:00.000Z"
      )
    ).toBe("released")
    expect(products[0].stock).toBe(5)
    expect(order.inventoryReservationStatus).toBe("RELEASED")

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "FAILED",
        "FAILED",
        "2026-09-26T02:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(5)
  })

  it("finalizes paid inventory without decrementing twice", () => {
    const products = [{ id: "p1", stock: 2 }]
    const order = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationStatus: "RESERVED" as const,
      inventoryReservedAt: "2026-09-26T00:00:00.000Z",
    }

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "PAID",
        "PAID",
        "2026-09-26T01:00:00.000Z"
      )
    ).toBe("finalized")
    expect(products[0].stock).toBe(2)
    expect(order.inventoryReservationStatus).toBe("FINALIZED")

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "PAID",
        "FAILED",
        "2026-09-26T02:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(2)
  })

  it("re-reserves inventory when a late paid event follows a release", () => {
    const products = [{ id: "p1", stock: 5 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationStatus: "RELEASED",
      inventoryReleasedAt: "2026-09-26T01:00:00.000Z",
    }

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "PAID",
        "PAID",
        "2026-09-26T02:00:00.000Z"
      )
    ).toBe("finalized")
    expect(products[0].stock).toBe(2)
    expect(order.inventoryReservationStatus).toBe("FINALIZED")
    expect(order.inventoryReReservedAt).toBe("2026-09-26T02:00:00.000Z")
  })

  it("fails closed if a late paid event cannot restore its released reservation", () => {
    const products = [{ id: "p1", stock: 1 }]
    const order = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationStatus: "RELEASED" as const,
    }

    expect(() =>
      applyStripeInventoryTransition(products, order, "PAID", "PAID")
    ).toThrow("INVENTORY_NOT_AVAILABLE")
    expect(products[0].stock).toBe(1)
    expect(order.inventoryReservationStatus).toBe("RELEASED")
  })

  it("detects products referenced by active reservations only", () => {
    const orders = [
      {
        items: [{ id: "p1", quantity: 1 }],
        inventoryReservationStatus: "RESERVED" as const,
      },
      {
        items: [{ id: "p2", quantity: 1 }],
        inventoryReservationStatus: "RELEASED" as const,
      },
    ]

    expect(hasActiveReservationForProduct(orders, "p1")).toBe(true)
    expect(hasActiveReservationForProduct(orders, "p2")).toBe(false)
  })

  it("protects products until their inventory lifecycle can no longer mutate stock", () => {
    const productId = "p1"

    expect(
      hasInventoryLifecycleDependencyForProduct(
        [
          {
            items: [{ id: productId, quantity: 1 }],
            inventoryReservationStatus: "RESERVED",
          },
        ],
        productId
      )
    ).toBe(true)

    expect(
      hasInventoryLifecycleDependencyForProduct(
        [
          {
            items: [{ id: productId, quantity: 1 }],
            inventoryReservationStatus: "FINALIZED",
          },
        ],
        productId
      )
    ).toBe(true)

    expect(
      hasInventoryLifecycleDependencyForProduct(
        [
          {
            items: [{ id: productId, quantity: 1 }],
            inventoryReservationStatus: "BROKEN",
          },
        ],
        productId
      )
    ).toBe(true)

    expect(
      hasInventoryLifecycleDependencyForProduct(
        [
          {
            items: [{ id: productId, quantity: 1 }],
            inventoryReservationStatus: "RELEASED",
          },
        ],
        productId
      )
    ).toBe(false)

    expect(
      hasInventoryLifecycleDependencyForProduct(
        [
          {
            items: [{ id: productId, quantity: 1 }],
            inventoryReservationStatus: "FINALIZED",
            inventoryRefundRestockedAt: "2026-09-26T18:00:00.000Z",
          },
        ],
        productId
      )
    ).toBe(false)
  })

  it("defers stock changes while a product has an active reservation", () => {
    const orders = [
      {
        items: [{ id: "p1", quantity: 2 }],
        inventoryReservationStatus: "RESERVED",
      },
    ]

    expect(shouldDeferProductStockWrite(orders, "p1", 3, 5)).toBe(true)
    expect(shouldDeferProductStockWrite(orders, "p1", 3, 3)).toBe(false)
    expect(shouldDeferProductStockWrite(orders, "p2", 3, 5)).toBe(false)
    expect(shouldDeferProductStockWrite(orders, "p1", 3, undefined)).toBe(false)
  })

  it("can release an explicit reservation directly", () => {
    const products = [{ id: "p1", stock: 1 }]
    releaseInventory(products, [{ id: "p1", quantity: 2 }])
    expect(products[0].stock).toBe(3)
  })

  it("fails closed on corrupt managed reservation records", () => {
    const products = [{ id: "p1", stock: 5 }]

    expect(() =>
      applyStripeInventoryTransition(
        products,
        {
          items: [{ id: "p1", quantity: 2 }],
          inventoryReservationStatus: "BROKEN",
        },
        "FAILED",
        "FAILED"
      )
    ).toThrow("INVENTORY_RESERVATION_INVALID_STATE")
    expect(products[0].stock).toBe(5)

    expect(() =>
      applyStripeInventoryTransition(
        products,
        { inventoryReservationStatus: "RESERVED" },
        "EXPIRED",
        "EXPIRED"
      )
    ).toThrow("INVENTORY_RESERVATION_MISSING_ITEMS")
    expect(products[0].stock).toBe(5)
  })

  it("adjusts an active reservation by the net quantity delta", () => {
    const products = [
      { id: "p1", stock: 3 },
      { id: "p2", stock: 4 },
    ]

    adjustInventoryReservation(
      products,
      [
        { id: "p1", quantity: 2 },
        { id: "p2", quantity: 2 },
      ],
      [
        { id: "p1", quantity: 4 },
        { id: "p2", quantity: 1 },
      ]
    )

    expect(products).toEqual([
      { id: "p1", stock: 1 },
      { id: "p2", stock: 5 },
    ])
  })

  it("rejects a reservation increase without partially mutating stock", () => {
    const products = [
      { id: "p1", stock: 1 },
      { id: "p2", stock: 3 },
    ]

    expect(() =>
      adjustInventoryReservation(
        products,
        [
          { id: "p1", quantity: 1 },
          { id: "p2", quantity: 2 },
        ],
        [
          { id: "p1", quantity: 3 },
          { id: "p2", quantity: 1 },
        ]
      )
    ).toThrow("INVENTORY_NOT_AVAILABLE")

    expect(products).toEqual([
      { id: "p1", stock: 1 },
      { id: "p2", stock: 3 },
    ])
  })

  it("keeps B2B stock reserved through confirmation and finalizes on shipping", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 2 }],
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
      inventoryReservedAt: "2026-09-26T08:00:00.000Z",
    }

    expect(
      applyOrderInventoryTransition(
        products,
        order,
        [{ id: "p1", quantity: 2 }],
        "CONFIRMED",
        "2026-09-26T09:00:00.000Z"
      )
    ).toBe("reserved")
    expect(products[0].stock).toBe(3)
    expect(order.inventoryReservationStatus).toBe("RESERVED")

    expect(
      applyOrderInventoryTransition(
        products,
        order,
        [{ id: "p1", quantity: 2 }],
        "SHIPPED",
        "2026-09-26T10:00:00.000Z"
      )
    ).toBe("finalized")
    expect(products[0].stock).toBe(3)
    expect(order.inventoryReservationStatus).toBe("FINALIZED")
    expect(order.inventoryFinalizedAt).toBe("2026-09-26T10:00:00.000Z")
  })

  it("releases a B2B reservation on cancellation exactly once", () => {
    const products = [{ id: "p1", stock: 3 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 2 }],
      inventoryReservationSource: "ORDER",
      inventoryReservationStatus: "RESERVED",
    }

    expect(
      applyOrderInventoryTransition(
        products,
        order,
        [{ id: "p1", quantity: 2 }],
        "CANCELLED",
        "2026-09-26T09:00:00.000Z"
      )
    ).toBe("released")
    expect(products[0].stock).toBe(5)
    expect(order.inventoryReservationStatus).toBe("RELEASED")

    expect(
      applyOrderInventoryTransition(
        products,
        order,
        [{ id: "p1", quantity: 2 }],
        "CANCELLED",
        "2026-09-26T10:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(5)
  })

  it("rejects quantity rewrites after B2B reservation release or finalization", () => {
    const products = [{ id: "p1", stock: 3 }]

    for (const status of ["RELEASED", "FINALIZED"] as const) {
      const order: InventoryReservationOrder = {
        items: [{ id: "p1", quantity: 2 }],
        inventoryReservationSource: "ORDER",
        inventoryReservationStatus: status,
      }

      expect(() =>
        applyOrderInventoryTransition(
          products,
          order,
          [{ id: "p1", quantity: 3 }],
          status === "RELEASED" ? "CANCELLED" : "SHIPPED"
        )
      ).toThrow(
        status === "RELEASED"
          ? "INVENTORY_RELEASED_ITEMS_IMMUTABLE"
          : "INVENTORY_FINALIZED_ITEMS_IMMUTABLE"
      )
    }
  })

  it("restocks a succeeded Stripe refund exactly once and blocks late checkout replay", () => {
    const products = [{ id: "p1", stock: 2 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "FINALIZED",
      inventoryFinalizedAt: "2026-09-26T08:00:00.000Z",
    }

    expect(
      applyStripeRefundInventory(
        products,
        order,
        "2026-09-26T09:00:00.000Z"
      )
    ).toBe("restocked")
    expect(products[0].stock).toBe(5)
    expect(order.inventoryRefundRestockedAt).toBe(
      "2026-09-26T09:00:00.000Z"
    )

    expect(
      applyStripeRefundInventory(
        products,
        order,
        "2026-09-26T10:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(5)

    expect(
      applyStripeInventoryTransition(
        products,
        order,
        "PAID",
        "PAID",
        "2026-09-26T11:00:00.000Z"
      )
    ).toBe("unchanged")
    expect(products[0].stock).toBe(5)
  })

  it("does not inflate stock for pre-reservation legacy Stripe refunds", () => {
    const products = [{ id: "p1", stock: 5 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 3 }],
    }

    expect(applyStripeRefundInventory(products, order)).toBe("legacy-unmanaged")
    expect(products[0].stock).toBe(5)
  })

  it("fails closed if refund inventory was already released", () => {
    const products = [{ id: "p1", stock: 5 }]
    const order: InventoryReservationOrder = {
      items: [{ id: "p1", quantity: 3 }],
      inventoryReservationSource: "STRIPE",
      inventoryReservationStatus: "RELEASED",
    }

    expect(() => applyStripeRefundInventory(products, order)).toThrow(
      "INVENTORY_REFUND_INVALID_STATE"
    )
    expect(products[0].stock).toBe(5)
  })

  it("leaves legacy Stripe orders unmanaged", () => {
    const products = [{ id: "p1", stock: 5 }]
    const order = { items: [{ id: "p1", quantity: 3 }] }

    expect(
      applyStripeInventoryTransition(products, order, "FAILED", "FAILED")
    ).toBe("legacy-unmanaged")
    expect(products[0].stock).toBe(5)
  })
})
