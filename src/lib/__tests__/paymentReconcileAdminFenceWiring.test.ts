import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

function expectFreshFenceBetween(
  route: string,
  providerWrite: string,
  startAfter = -1
) {
  const writeIndex = route.indexOf(providerWrite, startAfter + 1)
  const fenceIndex = route.indexOf(
    "assertFreshAdminAccess(authCheck.user)",
    startAfter + 1
  )

  expect(writeIndex).toBeGreaterThan(startAfter)
  expect(fenceIndex).toBeGreaterThan(startAfter)
  expect(fenceIndex).toBeLessThan(writeIndex)
  return writeIndex
}

describe("payment reconcile current-admin provider launch fencing", () => {
  it("fences each Stripe provider write with a fresh admin check", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    const checkoutWrite = expectFreshFenceBetween(
      route,
      "session = await createOrRecoverStripeCheckoutSession("
    )
    expectFreshFenceBetween(
      route,
      "refund = await stripe.refunds.create(",
      checkoutWrite
    )
  })

  it("fences each Przelewy24 provider write with a fresh admin check", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts"
    )

    const notificationVerify = expectFreshFenceBetween(
      route,
      "await verifyPrzelewy24Transaction(config, staged)"
    )
    const identityVerify = expectFreshFenceBetween(
      route,
      "await verifyPrzelewy24TransactionIdentity(config, transaction)",
      notificationVerify
    )
    expectFreshFenceBetween(
      route,
      "await requestPrzelewy24Refund(config, {",
      identityVerify
    )
  })

  it("does not authority-fence local reconciliation after a provider write", () => {
    for (const [relativePath, providerWrite, reconciliationMarker] of [
      [
        "src/app/api/payment-methods/reconcile/stripe/route.ts",
        "refund = await stripe.refunds.create(",
        "applyStripeRefundSnapshot(",
      ],
      [
        "src/app/api/payment-methods/reconcile/przelewy24/route.ts",
        "await verifyPrzelewy24Transaction(config, staged)",
        "applyVerifiedPrzelewy24Payment(",
      ],
    ] as const) {
      const route = read(relativePath)
      const writeIndex = route.indexOf(providerWrite)
      const reconcileIndex = route.indexOf(reconciliationMarker, writeIndex)
      const flow = route.slice(writeIndex, reconcileIndex)

      expect(writeIndex).toBeGreaterThan(-1)
      expect(reconcileIndex).toBeGreaterThan(writeIndex)
      expect(flow).not.toContain("assertFreshAdminAccess(authCheck.user)")
    }
  })
})
