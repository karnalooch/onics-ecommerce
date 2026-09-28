import { describe, expect, it } from "vitest"
import {
  QuoteBodyInvalidError,
  QuoteBodyTooLargeError,
  readQuoteJson,
} from "@/lib/quoteIngress"

describe("quote ingress", () => {
  it("rejects an oversized declared body without consuming it", async () => {
    const request = new Request("https://example.test/api/quotes", {
      method: "POST",
      headers: { "content-length": "17" },
      body: "{}",
    })

    await expect(readQuoteJson(request, 16)).rejects.toBeInstanceOf(
      QuoteBodyTooLargeError
    )
  })

  it("rejects a chunked body once the byte budget is exceeded", async () => {
    const request = new Request("https://example.test/api/quotes", {
      method: "POST",
      body: JSON.stringify({ message: "x".repeat(128) }),
    })

    await expect(readQuoteJson(request, 32)).rejects.toBeInstanceOf(
      QuoteBodyTooLargeError
    )
  })

  it("fails closed on malformed JSON and invalid UTF-8", async () => {
    const malformed = new Request("https://example.test/api/quotes", {
      method: "POST",
      body: "{",
    })
    await expect(readQuoteJson(malformed)).rejects.toBeInstanceOf(
      QuoteBodyInvalidError
    )

    const invalidUtf8 = new Request("https://example.test/api/quotes", {
      method: "POST",
      body: new Uint8Array([0xc3, 0x28]),
    })
    await expect(readQuoteJson(invalidUtf8)).rejects.toBeInstanceOf(
      QuoteBodyInvalidError
    )
  })
})
