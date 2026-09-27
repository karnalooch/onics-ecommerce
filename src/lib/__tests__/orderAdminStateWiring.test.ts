import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("admin order state fencing wiring", () => {
  it("publishes a state token only on the admin order view", () => {
    const route = read("src/app/api/orders/route.ts")

    expect(route).toContain(
      "adminStateToken: buildAdminOrderStateToken(order)"
    )
    expect(route).toContain(
      "orderStore.map((order) => withPaymentLifecycle(order, true))"
    )
    expect(route).toContain(
      "ownOrders.map((order) => withPaymentLifecycle(order))"
    )
  })

  it("exposes checkout registration state only on the admin order view", () => {
    const route = read("src/app/api/orders/route.ts")
    const helperStart = route.indexOf("function withPaymentLifecycle(")
    const helperEnd = route.indexOf("export async function GET()", helperStart)
    const helper = route.slice(helperStart, helperEnd)

    expect(helper).toContain("checkoutRegistrationStatus,")
    expect(helper).toContain("return includeAdminActions")
    expect(helper).toContain("internalCheckoutRegistrationStatus === \"UNCERTAIN\"")
    expect(route).toContain(
      "orderStore.map((order) => withPaymentLifecycle(order, true))"
    )
    expect(route).toContain(
      "ownOrders.map((order) => withPaymentLifecycle(order))"
    )
  })

  it("highlights uncertain checkout registration in the admin queue and modal", () => {
    const page = read("src/app/admin/orders/page.tsx")

    expect(page).toContain(
      'o.checkoutRegistrationStatus === "UNCERTAIN"'
    )
    expect(page).toContain("PAYMENT_REGISTRATION_UNCERTAIN")
    expect(page).toContain(
      'validatingOrder.checkoutRegistrationStatus === "UNCERTAIN"'
    )
    expect(page).toContain(
      "Rejestracja płatności wymaga ręcznej weryfikacji"
    )
  })

  it("requires the observed token before an admin PUT", () => {
    const route = read("src/app/api/orders/route.ts")

    expect(route).toContain("expectedStateToken:")
    expect(route).toContain(
      "parsed.data.expectedStateToken === undefined"
    )
    expect(route).toContain("{ status: 428 }")
  })

  it("rejects stale divergent snapshots before inventory side effects", () => {
    const route = read("src/app/api/orders/route.ts")
    const start = route.indexOf("export async function PUT")
    const flow = route.slice(start)

    expect(flow).toContain(
      "currentStateToken = buildAdminOrderStateToken(currentOrder)"
    )
    expect(flow).toContain("expectedStateToken !== currentStateToken")
    expect(flow).toContain("isAdminOrderUpdateReplay(")
    expect(flow).toContain('throw new Error("ORDER_STATE_CONFLICT")')
    expect(flow).toContain('code: "ORDER_STATE_CONFLICT"')
    expect(flow.indexOf("expectedStateToken !== currentStateToken"))
      .toBeLessThan(flow.indexOf("applyOrderInventoryTransition("))
    expect(flow.indexOf("isAdminOrderUpdateReplay(currentOrder"))
      .toBeLessThan(flow.indexOf("applyOrderInventoryTransition("))
  })

  it("keeps exact retries side-effect free and returns replay metadata", () => {
    const route = read("src/app/api/orders/route.ts")

    expect(route).toContain('return { order: currentOrder, replayed: true }')
    expect(route).toContain('"Idempotency-Replayed": "true"')
  })

  it("sends the state observed by the open admin modal", () => {
    const page = read("src/app/admin/orders/page.tsx")

    expect(page).toContain(
      "expectedStateToken: validatingOrder.adminStateToken"
    )
  })
})
