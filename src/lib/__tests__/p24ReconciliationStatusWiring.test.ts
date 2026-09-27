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
    expect(flow).toContain('recovery === "provider-paid"')
    expect(flow).toContain('recovery === "verify-required"')

    const verifyBranch = flow.indexOf('recovery === "verify-required"')
    expect(flow.indexOf("verifyPrzelewy24TransactionIdentity("))
      .toBeGreaterThan(verifyBranch)
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
