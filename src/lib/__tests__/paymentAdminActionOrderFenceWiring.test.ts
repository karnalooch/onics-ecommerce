import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("payment admin action order fencing wiring", () => {
  it("replays completed stale actions but rejects unrelated stale state", () => {
    const route = read("src/app/api/orders/payment-action/route.ts")

    expect(route).toContain("parsed.data.expectedStateToken === undefined")
    expect(route).toContain("classifyPaymentAdminActionPrecondition")
    expect(route).toContain('if (precondition === "replay")')
    expect(route).toContain("replayPaymentAdminAction(order)")
    expect(route).toContain('"Idempotency-Replayed": "true"')
    expect(route).toContain('if (precondition === "conflict")')
    expect(route).toContain("PAYMENT_ADMIN_STATE_CONFLICT")
    expect(route.indexOf("classifyPaymentAdminActionPrecondition("))
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

  it("returns a fresh decorated admin order after success and replay", () => {
    const route = read("src/app/api/orders/payment-action/route.ts")
    const describeStart = route.indexOf("function describeAdminPaymentOrder")
    const replayStart = route.indexOf("function replayPaymentAdminAction")
    const freshStart = route.indexOf("async function withFreshPaymentOrder")
    const postStart = route.indexOf("export async function POST")

    const describeFlow = route.slice(describeStart, replayStart)
    const replayFlow = route.slice(replayStart, freshStart)
    const freshFlow = route.slice(freshStart, postStart)

    expect(describeFlow).toContain(
      "adminStateToken: buildAdminOrderStateToken(order)"
    )
    expect(describeFlow).toContain(
      "paymentAdminActions: listAvailablePaymentAdminActions(order)"
    )
    expect(replayFlow).toContain("order: describeAdminPaymentOrder(order)")
    expect(freshFlow).toContain("order: describeAdminPaymentOrder(order)")
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
