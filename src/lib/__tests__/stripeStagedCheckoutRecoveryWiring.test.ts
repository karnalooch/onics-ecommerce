import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("staged Stripe checkout recovery wiring", () => {
  it("uses the same canonical checkout creator in normal and recovery flows", () => {
    const checkout = read("src/lib/paymentProviderCheckout.ts")
    const reconcile = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    expect(checkout).toContain(
      "createStripeCheckoutSessionForOrder("
    )
    expect(reconcile).toContain(
      "createStripeCheckoutSessionForOrder("
    )
  })

  it("persists the recovered session identity before normal reconciliation", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    expect(route).toContain(
      "isStripeStagedRecoveryWithinIdempotencyWindow(snapshotOrder)"
    )
    expect(route).toContain(
      "order.stripeCheckoutSessionId = recoveredSession.id"
    )
    expect(route).toContain(
      'order.paymentCheckoutRegistrationStatus = "READY"'
    )
    expect(route.indexOf("order.stripeCheckoutSessionId = recoveredSession.id"))
      .toBeLessThan(
        route.indexOf("stripe.checkout.sessions.retrieve(sessionId)")
      )
  })

  it("fails old staged registrations into manual review instead of creating a new session", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    expect(route).toContain(
      'error: "STRIPE_CHECKOUT_RECOVERY_WINDOW_EXPIRED"'
    )
    expect(route).toContain('outcome: "MANUAL_REVIEW"')
  })
})
