import { describe, expect, it } from "vitest"
import { buildAuthoritativeCartSnapshot } from "@/lib/cartSnapshot"

const products = [
  {
    id: "p1",
    sku: "SKU-1",
    name: "Produkt aktualny",
    price: 100,
    stock: 5,
  },
  {
    id: "p2",
    sku: "SKU-2",
    name: "Do wyceny",
    price: 0,
    stock: 0,
  },
]

describe("authoritative cart snapshot", () => {
  it("reprices stale client items from the current server catalog and account", () => {
    const snapshot = buildAuthoritativeCartSnapshot(
      [
        { id: "p1", quantity: 2 },
        { id: "p2", quantity: 1 },
      ],
      products,
      { role: "BIZ", discount: 15 }
    )

    expect(snapshot.items).toEqual([
      {
        id: "p1",
        sku: "SKU-1",
        name: "Produkt aktualny",
        price: 85,
        quantity: 2,
      },
      {
        id: "p2",
        sku: "SKU-2",
        name: "Do wyceny",
        price: 0,
        quantity: 1,
      },
    ])
    expect(snapshot.total).toBe(170)
  })

  it("keeps duplicate aggregation server-authoritative", () => {
    const snapshot = buildAuthoritativeCartSnapshot(
      [
        { id: "p1", quantity: 1 },
        { id: "p1", quantity: 2 },
      ],
      products,
      { role: "ADMIN" }
    )

    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0].quantity).toBe(3)
    expect(snapshot.total).toBe(300)
  })

  it("fails closed when a persisted cart references a removed product", () => {
    expect(() =>
      buildAuthoritativeCartSnapshot(
        [{ id: "missing", quantity: 1 }],
        products,
        { role: "BIZ", discount: 10 }
      )
    ).toThrow(/nie istnieje/)
  })
})
