import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readRoute() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/api/orders/przelewy24-return/route.ts"),
    "utf8"
  )
}

describe("Przelewy24 return current-admin launch fencing", () => {
  it("fences local RMA request before state mutation", () => {
    const route = readRoute()
    const requestStart = route.indexOf('if (parsed.data.action === "REQUEST")')
    const mutation = route.indexOf("mutateMockData((db) =>", requestStart)
    const adminFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      mutation
    )
    const write = route.indexOf("requestPrzelewy24Return(order)", adminFence)

    expect(mutation).toBeGreaterThan(requestStart)
    expect(adminFence).toBeGreaterThan(mutation)
    expect(write).toBeGreaterThan(adminFence)
  })

  it("fences RECEIVE and refund staging before provider-side refund request", () => {
    const route = readRoute()
    const intent = route.indexOf("const intent = await mutateMockData((db) =>")
    const adminFence = route.indexOf(
      "assertCurrentAdminAccess(db.users as StoredActor[], authCheck.user)",
      intent
    )
    const receive = route.indexOf("receivePrzelewy24Return(order)", adminFence)
    const stage = route.indexOf("stagePrzelewy24Refund(order)", receive)
    const providerWrite = route.indexOf(
      "await requestPrzelewy24Refund(config",
      stage
    )

    expect(intent).toBeGreaterThan(-1)
    expect(adminFence).toBeGreaterThan(intent)
    expect(receive).toBeGreaterThan(adminFence)
    expect(stage).toBeGreaterThan(receive)
    expect(providerWrite).toBeGreaterThan(stage)
    expect(route).toContain('code === "ADMIN_ACCESS_REVOKED"')
  })
})
