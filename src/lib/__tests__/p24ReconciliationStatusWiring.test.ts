import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Przelewy24 transaction status reconciliation wiring", () => {
  it("classifies provider status before deciding whether to verify", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts"
    )
    const genericStart = route.indexOf(
      "} else if (snapshotOrder.p24SessionId) {"
    )
    const refundStart = route.indexOf(
      "const currentSnapshot = initializeMockData()",
      genericStart
    )
    const flow = route.slice(genericStart, refundStart)

    expect(flow).toContain(
      "classifyPrzelewy24TransactionReconciliation(transaction)"
    )
    expect(flow).toContain('recovery === "provider-returned"')
    expect(flow).toContain("applyReturnedPrzelewy24Payment(")
    expect(flow).toContain('paymentAction = "RETURNED"')
    expect(flow).toContain('recovery === "provider-paid"')
    expect(flow).toContain('recovery === "verify-required"')

    const verifyBranch = flow.indexOf('recovery === "verify-required"')
    expect(flow.indexOf("verifyPrzelewy24TransactionIdentity("))
      .toBeGreaterThan(verifyBranch)
  })

  it("settles staged provider-returned recovery instead of replaying verify", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts"
    )
    const stagedStart = route.indexOf(
      "if (snapshotOrder.p24VerificationPending) {"
    )
    const genericStart = route.indexOf(
      "} else if (snapshotOrder.p24SessionId) {",
      stagedStart
    )
    const flow = route.slice(stagedStart, genericStart)

    const returnedBranch = flow.indexOf(
      'recovery === "provider-returned"'
    )
    const returnedApply = flow.indexOf(
      "applyReturnedPrzelewy24Payment("
    )
    const verify = flow.indexOf("verifyPrzelewy24Transaction(config, staged)")

    expect(returnedBranch).toBeGreaterThan(-1)
    expect(returnedApply).toBeGreaterThan(returnedBranch)
    expect(verify).toBeGreaterThan(returnedApply)
    expect(flow).toContain('paymentAction = "RETURNED"')
  })

  it("surfaces provider-returned fulfillment conflicts as manual review", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts"
    )
    const catchStart = route.indexOf("} catch (error) {")
    const summaryStart = route.indexOf("const summary = results.reduce(", catchStart)
    const flow = route.slice(catchStart, summaryStart)

    expect(flow).toContain(
      'errorCode === "PRZELEWY24_RETURNED_PAYMENT_REQUIRES_REVIEW"'
    )
    expect(flow).toContain(
      'outcome: requiresManualReview ? "MANUAL_REVIEW" : "FAILED"'
    )
  })

  it("does not turn the unpaid branch into a local payment write", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts"
    )
    const genericStart = route.indexOf(
      "} else if (snapshotOrder.p24SessionId) {"
    )
    const refundStart = route.indexOf(
      "const currentSnapshot = initializeMockData()",
      genericStart
    )
    const flow = route.slice(genericStart, refundStart)

    expect(flow).not.toContain('recovery === "unpaid"')
  })
})
