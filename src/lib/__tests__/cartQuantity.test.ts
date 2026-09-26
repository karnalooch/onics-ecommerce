import { describe, expect, it } from "vitest"
import {
  CART_ITEM_QUANTITY_MAX,
  isValidCartItemQuantity,
  resolveMergedCartQuantity,
} from "@/lib/cartQuantity"

describe("cart quantity boundary", () => {
  it("accepts the supported transaction quantity range", () => {
    expect(isValidCartItemQuantity(1)).toBe(true)
    expect(isValidCartItemQuantity(CART_ITEM_QUANTITY_MAX)).toBe(true)
    expect(isValidCartItemQuantity(0)).toBe(false)
    expect(isValidCartItemQuantity(CART_ITEM_QUANTITY_MAX + 1)).toBe(false)
    expect(isValidCartItemQuantity(1.5)).toBe(false)
  })

  it("rejects a merge that would move a persisted cart above the API limit", () => {
    expect(resolveMergedCartQuantity(9999, 1)).toBe(10000)
    expect(resolveMergedCartQuantity(9999, 2)).toBeNull()
    expect(resolveMergedCartQuantity(10000, 1)).toBeNull()
  })

  it("rejects malformed incoming quantities instead of corrupting the cart", () => {
    expect(resolveMergedCartQuantity(1, 0)).toBeNull()
    expect(resolveMergedCartQuantity(1, 10001)).toBeNull()
    expect(resolveMergedCartQuantity(1, Number.NaN)).toBeNull()
  })
})
