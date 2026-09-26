import { describe, expect, it } from "vitest"
import {
  AdminQuoteUpdateSchema,
  assertQuoteAdminTransition,
  requireQuoteBasePrice,
} from "../quoteAdmin"

describe("quote admin invariants", () => {
  it("accepts a complete quoted payload", () => {
    expect(
      AdminQuoteUpdateSchema.parse({
        id: "QUOTE-1",
        status: "QUOTED",
        deliveryTimeDays: 14,
        additionalDiscount: 7.5,
      })
    ).toEqual({
      id: "QUOTE-1",
      status: "QUOTED",
      deliveryTimeDays: 14,
      additionalDiscount: 7.5,
    })
  })

  it("requires a 1-365 integer delivery time for quoted offers", () => {
    for (const deliveryTimeDays of [undefined, null, 0, 366, 2.5]) {
      expect(
        AdminQuoteUpdateSchema.safeParse({
          id: "QUOTE-1",
          status: "QUOTED",
          deliveryTimeDays,
          additionalDiscount: 0,
        }).success
      ).toBe(false)
    }
  })

  it("keeps rejected offers free of quote terms", () => {
    expect(
      AdminQuoteUpdateSchema.parse({
        id: "QUOTE-1",
        status: "REJECTED",
        deliveryTimeDays: null,
        additionalDiscount: 0,
      })
    ).toEqual({
      id: "QUOTE-1",
      status: "REJECTED",
      deliveryTimeDays: null,
      additionalDiscount: 0,
    })

    expect(
      AdminQuoteUpdateSchema.safeParse({
        id: "QUOTE-1",
        status: "REJECTED",
        deliveryTimeDays: 14,
        additionalDiscount: 0,
      }).success
    ).toBe(false)

    expect(
      AdminQuoteUpdateSchema.safeParse({
        id: "QUOTE-1",
        status: "REJECTED",
        deliveryTimeDays: null,
        additionalDiscount: 5,
      }).success
    ).toBe(false)
  })

  it("allows admin decisions only for actionable quote states", () => {
    expect(() => assertQuoteAdminTransition("PENDING")).not.toThrow()
    expect(() => assertQuoteAdminTransition("INQUIRY")).not.toThrow()

    for (const status of ["QUOTED", "REJECTED", "CANCELLED", undefined]) {
      expect(() => assertQuoteAdminTransition(status)).toThrow(
        "QUOTE_NOT_ACTIONABLE"
      )
    }
  })

  it("requires a positive finite catalog price before quoting", () => {
    expect(requireQuoteBasePrice(125.5)).toBe(125.5)

    for (const price of [null, undefined, 0, -1, Number.NaN, Infinity]) {
      expect(() => requireQuoteBasePrice(price)).toThrow(
        "QUOTE_PRODUCT_NOT_PRICED"
      )
    }
  })
})
