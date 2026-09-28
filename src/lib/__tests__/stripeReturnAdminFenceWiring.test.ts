import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readRoute() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/api/orders/return/route.ts"),
    "utf8"
  )
}

describe("Stripe return current-admin launch fencing", () => {
  it("fences REQUEST and RECEIVE mutations before RMA state changes", () => {
    const route = readRoute()
    const requestStart = route.indexOf(
      'if (parsed.data.action === "REQUEST")'
    )
    const requestMutation = route.indexOf("mutateMockData((db) =>", requestStart)
    const requestFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      requestMutation
    )
    const requestWrite = route.indexOf("requestShippedReturn(order)", requestFence)

    const receiveStart = route.indexOf("const received = await mutateMockData((db) =>")
    const receiveFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      receiveStart
    )
    const receiveWrite = route.indexOf("receiveShippedReturn(", receiveFence)

    expect(requestMutation).toBeGreaterThan(requestStart)
    expect(requestFence).toBeGreaterThan(requestMutation)
    expect(requestWrite).toBeGreaterThan(requestFence)
    expect(receiveFence).toBeGreaterThan(receiveStart)
    expect(receiveWrite).toBeGreaterThan(receiveFence)
    expect(route).toContain('code === "ADMIN_ACCESS_REVOKED"')
  })

  it("keeps refund staging and post-provider reconciliation authority-independent", () => {
    const route = readRoute()
    const staged = route.indexOf("const staged = await mutateMockData((db) =>")
    const providerWrite = route.indexOf("stripe.refunds.create(", staged)
    const finalReconcile = route.indexOf(
      "const updated = await mutateMockData((db) =>",
      providerWrite
    )
    const stagedFlow = route.slice(staged, providerWrite)
    const reconcileFlow = route.slice(finalReconcile, route.indexOf("const response =", finalReconcile))

    expect(staged).toBeGreaterThan(-1)
    expect(providerWrite).toBeGreaterThan(staged)
    expect(stagedFlow).not.toContain("assertCurrentAdminAccess(")
    expect(finalReconcile).toBeGreaterThan(providerWrite)
    expect(reconcileFlow).not.toContain("assertCurrentAdminAccess(")
    expect(reconcileFlow).toContain("applyStripeRefundSnapshot(")
  })
})
