import { describe, expect, it } from "vitest"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"

describe("commerce ingress", () => {
  it("rejects an oversized declared body without consuming it", async () => {
    const request = new Request("https://example.test/api/checkout", {
      method: "POST",
      headers: { "content-length": "17" },
      body: "{}",
    })

    await expect(readCommerceJson(request, 16)).rejects.toBeInstanceOf(
      CommerceBodyTooLargeError
    )
  })

  it("rejects a chunked body once the byte budget is exceeded", async () => {
    const request = new Request("https://example.test/api/cart/preview", {
      method: "POST",
      body: JSON.stringify({ items: [{ id: "x".repeat(128), quantity: 1 }] }),
    })

    await expect(readCommerceJson(request, 32)).rejects.toBeInstanceOf(
      CommerceBodyTooLargeError
    )
  })

  it("fails closed on malformed JSON and invalid UTF-8", async () => {
    const malformed = new Request("https://example.test/api/cart/preview", {
      method: "POST",
      body: "{",
    })
    await expect(readCommerceJson(malformed)).rejects.toBeInstanceOf(
      CommerceBodyInvalidError
    )

    const invalidUtf8 = new Request("https://example.test/api/cart/offer-preview", {
      method: "POST",
      body: new Uint8Array([0xc3, 0x28]),
    })
    await expect(readCommerceJson(invalidUtf8)).rejects.toBeInstanceOf(
      CommerceBodyInvalidError
    )
  })

  it("returns valid JSON within the byte budget", async () => {
    const payload = { items: [{ id: "sku-1", quantity: 2 }] }
    const request = new Request("https://example.test/api/cart/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    await expect(readCommerceJson(request)).resolves.toEqual(payload)
  })
})
