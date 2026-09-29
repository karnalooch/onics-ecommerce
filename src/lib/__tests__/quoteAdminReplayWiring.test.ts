import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("quote admin replay wiring", () => {
  it("rechecks current admin access inside the quote update mutation", () => {
    const route = read("src/app/api/quotes/route.ts")
    const start = route.indexOf("export async function PUT")
    const flow = route.slice(start)
    const mutation = flow.indexOf("mutateMockData((db) =>")
    const adminFence = flow.indexOf(
      'hasAccountRoleAccess(currentActor, ["ADMIN"])',
      mutation
    )
    const targetLookup = flow.indexOf(
      "const quoteIndex = orders.findIndex(",
      adminFence
    )
    const write = flow.indexOf("orders[quoteIndex] = nextQuote", adminFence)

    expect(start).toBeGreaterThan(-1)
    expect(mutation).toBeGreaterThan(-1)
    expect(adminFence).toBeGreaterThan(mutation)
    expect(targetLookup).toBeGreaterThan(adminFence)
    expect(write).toBeGreaterThan(adminFence)
    expect(flow).toContain('throw new Error("ADMIN_ACCESS_REVOKED")')
  })

  it("checks exact replay before stale-status and terminal transition gates", () => {
    const route = read("src/app/api/quotes/route.ts")
    const start = route.indexOf("export async function PUT")
    const flow = route.slice(start)

    expect(flow).toContain("isQuoteAdminUpdateReplay(quote, parsed.data)")
    expect(flow).toContain("assertQuoteAdminExpectedStatus(")
    expect(flow).toContain("parsed.data.expectedStatus")
    expect(flow).toContain("assertQuoteAdminTransition(quote.status)")
    expect(flow.indexOf("isQuoteAdminUpdateReplay(quote, parsed.data)"))
      .toBeLessThan(flow.indexOf("assertQuoteAdminExpectedStatus("))
    expect(flow.indexOf("assertQuoteAdminExpectedStatus("))
      .toBeLessThan(flow.indexOf("assertQuoteAdminTransition(quote.status)"))
    expect(flow).toContain('"QUOTE_STATUS_CONFLICT"')
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

  it("wires the observed status from operator UI and renders the pending queue", () => {
    const actions = read("src/app/admin/AdminActions.tsx")
    const dashboard = read("src/app/admin/page.tsx")

    expect(actions.match(/expectedStatus: currentStatus/g)?.length).toBe(2)
    expect(dashboard).toContain('href: "/admin#pending-quotes"')
    expect(dashboard).toContain('id="pending-quotes"')
    expect(dashboard).toContain('actionType="processQuote"')
    expect(dashboard).toContain('currentStatus={String(quote.status || "")}')
  })

  it("keeps divergent terminal retries behind the existing conflict gate", () => {
    const helper = read("src/lib/quoteAdmin.ts")

    expect(helper).toContain(
      "if (state.status !== requested.status) return false"
    )
    expect(helper).toContain(
      'throw new Error("QUOTE_NOT_ACTIONABLE")'
    )
  })
})
