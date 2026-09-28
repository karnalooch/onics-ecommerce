import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { readBoundedJson } from "../boundedJsonIngress"

function requestWithChunks(
  chunks: Uint8Array[],
  headers: Record<string, string> = {}
) {
  return {
    headers: new Headers(headers),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      },
    }),
  } as Request
}

const bytes = (value: string) => new TextEncoder().encode(value)

describe("bounded authenticated JSON ingress", () => {
  it("rejects an oversized declared Content-Length before parsing", async () => {
    const result = await readBoundedJson(
      requestWithChunks([bytes("{}")], { "content-length": "5" }),
      4
    )

    expect(result).toEqual({ ok: false, error: "too-large" })
  })

  it("enforces streamed bytes without Content-Length", async () => {
    const result = await readBoundedJson(
      requestWithChunks([bytes('{"a":'), bytes('"x"}')]),
      8
    )

    expect(result).toEqual({ ok: false, error: "too-large" })
  })

  it("does not trust an understated Content-Length", async () => {
    const result = await readBoundedJson(
      requestWithChunks([bytes('{"oversized":true}')], {
        "content-length": "2",
      }),
      8
    )

    expect(result).toEqual({ ok: false, error: "too-large" })
  })

  it("rejects invalid UTF-8", async () => {
    const result = await readBoundedJson(
      requestWithChunks([new Uint8Array([0xff])]),
      8
    )

    expect(result).toEqual({ ok: false, error: "invalid" })
  })

  it("rejects malformed JSON after bounded decoding", async () => {
    const result = await readBoundedJson(
      requestWithChunks([bytes('{"broken":')]),
      32
    )

    expect(result).toEqual({ ok: false, error: "invalid" })
  })

  it("parses valid JSON within the configured limit", async () => {
    const raw = '{"ok":true}'
    const result = await readBoundedJson(
      requestWithChunks([bytes(raw)]),
      bytes(raw).byteLength
    )

    expect(result).toEqual({ ok: true, value: { ok: true } })
  })

  it("removes raw req.json() from every BIZ-accessible JSON mutation route", () => {
    const routes = [
      "src/app/api/cart/preview/route.ts",
      "src/app/api/cart/offer-preview/route.ts",
      "src/app/api/checkout/route.ts",
      "src/app/api/orders/route.ts",
      "src/app/api/profile/route.ts",
      "src/app/api/quotes/route.ts",
      "src/app/api/repairs/route.ts",
    ]

    for (const route of routes) {
      const source = fs.readFileSync(path.join(process.cwd(), route), "utf8")
      expect(source, route).toContain("readBoundedJson(req)")
      expect(source, route).not.toContain("req.json()")
      expect(source.indexOf("authorizeAPI("), route).toBeLessThan(
        source.indexOf("readBoundedJson(req)")
      )
    }
  })
})
