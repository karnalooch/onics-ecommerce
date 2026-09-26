import { describe, expect, it } from "vitest"
import {
  sanitizeCartItems,
  sanitizePersistedCartState,
} from "@/lib/cartPersist"

const validItem = {
  id: "product-1",
  sku: "ABC-1",
  name: "Product",
  price: 12.5,
  quantity: 2,
}

describe("persisted cart sanitization", () => {
  it("accepts and normalizes a valid persisted cart", () => {
    expect(
      sanitizePersistedCartState({
        ownerKey: " id:user-1 ",
        items: [{ ...validItem, id: " product-1 ", sku: " ABC-1 " }],
      })
    ).toEqual({
      ownerKey: "id:user-1",
      items: [{ ...validItem, id: "product-1", sku: "ABC-1" }],
    })
  })

  it("rejects the complete item set when one persisted entry is malformed", () => {
    expect(
      sanitizePersistedCartState({
        ownerKey: "id:user-1",
        items: [validItem, { ...validItem, id: "product-2", quantity: 10001 }],
      })
    ).toEqual({
      ownerKey: "id:user-1",
      items: [],
    })

    expect(
      sanitizePersistedCartState({
        ownerKey: "id:user-1",
        items: [validItem, { ...validItem, id: "product-2", price: Number.NaN }],
      })
    ).toEqual({
      ownerKey: "id:user-1",
      items: [],
    })
  })

  it("rejects duplicate product ids instead of preserving ambiguous state", () => {
    expect(
      sanitizeCartItems([
        validItem,
        { ...validItem, sku: "OTHER-SKU", name: "Duplicate" },
      ])
    ).toBeNull()
  })

  it("fails closed for non-object persisted payloads", () => {
    expect(sanitizePersistedCartState("corrupt")).toEqual({
      ownerKey: null,
      items: [],
    })
  })
})
