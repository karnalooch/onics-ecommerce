import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readRoute() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/api/orders/cancel/route.ts"),
    "utf8"
  )
}

describe("Stripe cancel current-admin launch fencing", () => {
  it("fences paid refund staging before provider refund creation", () => {
    const route = readRoute()
    const staged = route.indexOf("const staged = await mutateMockData((db) =>")
    const adminFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      staged
    )
    const intentStage = route.indexOf("stageStripeRefundIntent(fresh)", staged)
    const providerWrite = route.indexOf("stripe.refunds.create(", staged)

    expect(staged).toBeGreaterThan(-1)
    expect(adminFence).toBeGreaterThan(staged)
    expect(intentStage).toBeGreaterThan(adminFence)
    expect(providerWrite).toBeGreaterThan(intentStage)
  })

  it("fences unpaid cancellation launch before expiring Stripe session", () => {
    const route = readRoute()
    const preflight = route.indexOf("const cancelPreflight = await mutateMockData((db) =>")
    const adminFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      preflight
    )
    const providerWrite = route.indexOf(
      "stripe.checkout.sessions.expire(session.id)",
      preflight
    )

    expect(preflight).toBeGreaterThan(-1)
    expect(adminFence).toBeGreaterThan(preflight)
    expect(providerWrite).toBeGreaterThan(adminFence)
    expect(route).toContain('error.message === "ADMIN_ACCESS_REVOKED"')
  })

  it("does not authority-fence post-provider refund reconciliation", () => {
    const route = readRoute()
    const providerWrite = route.indexOf("stripe.refunds.create(")
    const reconcile = route.indexOf("const updated = await mutateMockData((db) =>", providerWrite)
    const reconcileEnd = route.indexOf("const response =", reconcile)
    const flow = route.slice(reconcile, reconcileEnd)

    expect(providerWrite).toBeGreaterThan(-1)
    expect(reconcile).toBeGreaterThan(providerWrite)
    expect(flow).not.toContain("assertCurrentAdminAccess(")
    expect(flow).toContain("applyStripeRefundSnapshot(")
  })
})
