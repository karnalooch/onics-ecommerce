import { describe, expect, it } from "vitest"
import { resolveEstimatedDeliveryDays } from "@/lib/orders"

describe("order delivery estimate updates", () => {
  it("preserves the existing estimate when the field is omitted", () => {
    expect(resolveEstimatedDeliveryDays(undefined, 14)).toBe(14)
    expect(resolveEstimatedDeliveryDays(undefined, null)).toBeNull()
  })

  it("clears the existing estimate when null is sent explicitly", () => {
    expect(resolveEstimatedDeliveryDays(null, 14)).toBeNull()
  })

  it("replaces the estimate when a number is provided", () => {
    expect(resolveEstimatedDeliveryDays(7, 14)).toBe(7)
  })
})
