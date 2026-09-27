import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Stripe refund recovery wiring", () => {
  it("stages refund intent before Stripe cancel side effects", () => {
    const route = read("src/app/api/orders/cancel/route.ts")
    const stage = route.indexOf("stageStripeRefundIntent(fresh)")
    const create = route.indexOf("stripe.refunds.create(")

    expect(stage).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(stage)
    expect(route).toContain("stateToken: buildAdminOrderStateToken(fresh)")
  })

  it("stages refund intent before Stripe RMA refund side effects", () => {
    const route = read("src/app/api/orders/return/route.ts")
    const stage = route.indexOf("stageStripeRefundIntent(order)")
    const create = route.indexOf("stripe.refunds.create(")

    expect(stage).toBeGreaterThan(-1)
    expect(create).toBeGreaterThan(stage)
    expect(route).toContain("stateToken: buildAdminOrderStateToken(order)")
  })

  it("discovers or reissues an orphaned staged refund during reconciliation", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    expect(route).toContain("currentOrder?.refundRequestedAt")
    expect(route).toContain("stripe.refunds.list({")
    expect(route).toContain("payment_intent: intentId")
    expect(route).toContain("selectRecoverableRefund(")
    expect(route).toContain("stripeRefundRecoveryKey(currentOrder)")
    expect(route).toContain("stripe.refunds.create(")
  })
})
