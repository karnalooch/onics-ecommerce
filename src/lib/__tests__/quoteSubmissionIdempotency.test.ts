import { describe, expect, it } from "vitest"
import { buildQuoteSubmissionFingerprint } from "@/lib/quoteSubmissionIdempotency"

describe("quote submission idempotency", () => {
  it("canonicalizes surrounding whitespace", () => {
    expect(
      buildQuoteSubmissionFingerprint({
        productId: " p-1 ",
        expectedQuantity: 10,
        message: " pilne ",
      })
    ).toBe(
      buildQuoteSubmissionFingerprint({
        productId: "p-1",
        expectedQuantity: 10,
        message: "pilne",
      })
    )
  })

  it("changes when immutable request content changes", () => {
    const base = buildQuoteSubmissionFingerprint({
      productId: "p-1",
      expectedQuantity: 10,
      message: "pilne",
    })

    expect(
      buildQuoteSubmissionFingerprint({
        productId: "p-2",
        expectedQuantity: 10,
        message: "pilne",
      })
    ).not.toBe(base)
    expect(
      buildQuoteSubmissionFingerprint({
        productId: "p-1",
        expectedQuantity: 11,
        message: "pilne",
      })
    ).not.toBe(base)
    expect(
      buildQuoteSubmissionFingerprint({
        productId: "p-1",
        expectedQuantity: 10,
        message: "standard",
      })
    ).not.toBe(base)
  })

  it("rejects invalid quantity or product identity", () => {
    expect(() =>
      buildQuoteSubmissionFingerprint({
        productId: "",
        expectedQuantity: 1,
        message: "",
      })
    ).toThrow("QUOTE_IDEMPOTENCY_PAYLOAD_INVALID")

    expect(() =>
      buildQuoteSubmissionFingerprint({
        productId: "p-1",
        expectedQuantity: 0,
        message: "",
      })
    ).toThrow("QUOTE_IDEMPOTENCY_PAYLOAD_INVALID")
  })
})
