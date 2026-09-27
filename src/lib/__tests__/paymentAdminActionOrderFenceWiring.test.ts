import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("payment admin action order fencing wiring", () => {
  it("rejects payment actions from a stale admin order snapshot", () => {
    const route = read("src/app/api/orders/payment-action/route.ts")

    expect(route).toContain("parsed.data.expectedStateToken === undefined")
    expect(route).toContain(
      "parsed.data.expectedStateToken !== buildAdminOrderStateToken(order)"
    )
    expect(route).toContain("PAYMENT_ADMIN_STATE_CONFLICT")
    expect(route.indexOf("parsed.data.expectedStateToken !=="))
      .toBeLessThan(route.indexOf("resolveOrderPaymentProvider(order)"))
  })

  it("sends the displayed order token with every payment action", () => {
    const page = read("src/app/admin/orders/page.tsx")
    const calls = page
      .split('fetch("/api/orders/payment-action"')
      .slice(1)

    expect(calls).toHaveLength(4)
    for (const call of calls) {
      expect(call.slice(0, 400)).toContain(
        "expectedStateToken: validatingOrder.adminStateToken"
      )
    }
  })

  it("forwards the observed order state token into ORDER_CANCEL", () => {
    const route = read("src/app/api/orders/payment-action/route.ts")
    const start = route.indexOf('case "ORDER_CANCEL"')
    const end = route.indexOf("break", start)
    const flow = route.slice(start, end)

    expect(flow).toContain(
      "expectedStateToken: buildAdminOrderStateToken(order)"
    )
    expect(flow).toContain('status: "CANCELLED"')
    expect(flow.indexOf("expectedStateToken:"))
      .toBeLessThan(flow.indexOf('status: "CANCELLED"'))
  })

  it("returns a fresh admin state token after every successful payment action", () => {
    const route = read("src/app/api/orders/payment-action/route.ts")
    const start = route.indexOf("async function withFreshPaymentOrder")
    const end = route.indexOf("export async function POST", start)
    const flow = route.slice(start, end)

    expect(flow).toContain(
      "adminStateToken: buildAdminOrderStateToken(order)"
    )
    expect(flow).toContain(
      "paymentAdminActions: listAvailablePaymentAdminActions(order)"
    )
  })

  it("uses the same canonical order fence primitive as admin PUT", () => {
    const dispatcher = read("src/app/api/orders/payment-action/route.ts")
    const orders = read("src/app/api/orders/route.ts")

    expect(dispatcher).toContain(
      'import { buildAdminOrderStateToken } from "@/lib/orderAdminState"'
    )
    expect(orders).toContain(
      "currentStateToken = buildAdminOrderStateToken(currentOrder)"
    )
  })
})
