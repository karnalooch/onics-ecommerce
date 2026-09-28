import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("order and quote JSON ingress wiring", () => {
  it("bounds both order write handlers with a 512 KiB cap", () => {
    const route = read("src/app/api/orders/route.ts")
    const postStart = route.indexOf("export async function POST")
    const putStart = route.indexOf("export async function PUT")
    const postRead = route.indexOf(
      "readCommerceJson(req, ORDER_MAX_BODY_BYTES)",
      postStart
    )
    const putRead = route.indexOf(
      "readCommerceJson(req, ORDER_MAX_BODY_BYTES)",
      putStart
    )

    expect(route).toContain("const ORDER_MAX_BODY_BYTES = 512 * 1024")
    expect(route).not.toContain("req.json()")
    expect(postRead).toBeGreaterThan(postStart)
    expect(postRead).toBeLessThan(putStart)
    expect(putRead).toBeGreaterThan(putStart)
  })

  it("reuses bounded quote ingress for admin quote updates", () => {
    const route = read("src/app/api/quotes/route.ts")
    const putStart = route.indexOf("export async function PUT")
    const boundedRead = route.indexOf("readQuoteJson(req)", putStart)

    expect(route).not.toContain("req.json()")
    expect(boundedRead).toBeGreaterThan(putStart)
    expect(route.slice(putStart)).toContain("QuoteBodyTooLargeError")
    expect(route.slice(putStart)).toContain("QuoteBodyInvalidError")
  })
})
