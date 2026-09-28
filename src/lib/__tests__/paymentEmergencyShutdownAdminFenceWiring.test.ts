import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readRoute() {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/api/payment-methods/emergency-shutdown/route.ts"
    ),
    "utf8"
  )
}

describe("emergency shutdown current-admin provider fencing", () => {
  it("checks fresh admin access immediately before Stripe session expiration", () => {
    const route = readRoute()
    const write = route.indexOf(
      "session = await stripe.checkout.sessions.expire(session.id)"
    )
    const fence = route.lastIndexOf(
      "assertFreshAdminAccess(authCheck.user)",
      write
    )

    expect(write).toBeGreaterThan(-1)
    expect(fence).toBeGreaterThan(-1)
    expect(fence).toBeLessThan(write)
  })

  it("stops future provider writes when current admin access is revoked", () => {
    const route = readRoute()

    expect(route).toContain('expireError.message === "ADMIN_ACCESS_REVOKED"')
    expect(route).toContain("accessRevoked = true")
    expect(route).toContain("break")
    expect(route).toContain("status: accessRevoked ? 403")
  })

  it("keeps local post-expiration reconciliation free of an authority fence", () => {
    const route = readRoute()
    const write = route.indexOf(
      "session = await stripe.checkout.sessions.expire(session.id)"
    )
    const reconcile = route.indexOf(
      "await mutateMockData((db) =>",
      write
    )
    const apply = route.indexOf(
      "applyExpiredCheckoutCancellation(",
      reconcile
    )
    const flow = route.slice(reconcile, apply)

    expect(write).toBeGreaterThan(-1)
    expect(reconcile).toBeGreaterThan(write)
    expect(apply).toBeGreaterThan(reconcile)
    expect(flow).not.toContain("assertFreshAdminAccess(")
  })
})
