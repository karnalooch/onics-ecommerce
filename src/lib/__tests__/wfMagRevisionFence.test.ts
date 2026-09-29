import { describe, expect, it } from "vitest"
import { processInventoryData } from "@/app/admin/products/_lib/inventoryLogic"
import type { IProduct } from "@/app/admin/products/_lib/types"

describe("WF-Mag staging revision binding", () => {
  const existing: IProduct = {
    id: "p1",
    sku: "SKU-1",
    name: "Existing",
    price: 100,
    stock: 5,
    manufacturer: "SATEL",
    categoryId: null,
    subcategoryId: null,
    revision: 7,
  }

  it("carries the observed revision for an existing SKU", () => {
    const { staging } = processInventoryData(
      [
        {
          sku: "SKU-1",
          name: "Existing",
          price: 120,
          stock: 6,
          manufacturer: "SATEL",
        },
      ],
      [existing],
      [],
      []
    )

    expect(staging).toHaveLength(1)
    expect(staging[0].expectedRevision).toBe(7)
    expect(staging[0].knowledgeMatched).toBe(true)
  })

  it("leaves expectedRevision absent for a genuinely new SKU", () => {
    const { staging } = processInventoryData(
      [
        {
          sku: "SKU-2",
          name: "New",
          price: 50,
          stock: 2,
          manufacturer: "SATEL",
        },
      ],
      [existing],
      [],
      []
    )

    expect(staging).toHaveLength(1)
    expect(staging[0].expectedRevision).toBeUndefined()
    expect(staging[0].knowledgeMatched).toBe(false)
  })
})
