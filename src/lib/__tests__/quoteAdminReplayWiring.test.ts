import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("quote admin replay wiring", () => {
  it("checks exact replay before the terminal transition gate", () => {
    const route = read("src/app/api/quotes/route.ts")
    const start = route.indexOf("export async function PUT")
    const flow = route.slice(start)

    expect(flow).toContain("isQuoteAdminUpdateReplay(quote, parsed.data)")
    expect(flow).toContain("assertQuoteAdminTransition(quote.status)")
    expect(flow.indexOf("isQuoteAdminUpdateReplay(quote, parsed.data)"))
      .toBeLessThan(flow.indexOf("assertQuoteAdminTransition(quote.status)"))
  })

  it("returns the stored quote without recalculating on replay", () => {
    const route = read("src/app/api/quotes/route.ts")
    const start = route.indexOf("export async function PUT")
    const flow = route.slice(start)

    expect(flow).toContain("return { quote, replayed: true }")
    expect(flow.indexOf("return { quote, replayed: true }"))
      .toBeLessThan(flow.indexOf("requireQuoteBasePrice(product.price)"))
    expect(flow).toContain('"Idempotency-Replayed": "true"')
  })

  it("keeps divergent terminal retries behind the existing conflict gate", () => {
    const helper = read("src/lib/quoteAdmin.ts")

    expect(helper).toContain(
      "if (current.status !== requested.status) return false"
    )
    expect(helper).toContain(
      'throw new Error("QUOTE_NOT_ACTIONABLE")'
    )
  })
})
