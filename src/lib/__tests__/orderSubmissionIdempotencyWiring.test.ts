import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("order submission idempotency wiring", () => {
  it("checks an account-scoped idempotency key before inventory reservation", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/orders/route.ts"),
      "utf8"
    )

    expect(route).toContain("requestId: z.string().uuid()")
    expect(route).toContain("order.clientRequestId === parsed.data.requestId")
    expect(route).toContain("buildOrderSubmissionItemsFingerprint(")
    expect(route).toContain("existingOrder.clientRequestFingerprint !== requestFingerprint")
    expect(route).toContain("clientRequestId: parsed.data.requestId")
    expect(route).toContain("clientRequestFingerprint: requestFingerprint")
    expect(route.indexOf("order.clientRequestId === parsed.data.requestId"))
      .toBeLessThan(route.indexOf("reserveInventory("))
  })

  it("reuses a pending browser key and clears it only after a matching success", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    const actionStart = page.indexOf("const handleAction = async")
    const actionEnd = page.indexOf("const orderImportCard", actionStart)
    const actionFlow = page.slice(actionStart, actionEnd)

    expect(actionFlow).toContain("getOrCreateOrderSubmissionRequestId(")
    expect(actionFlow).toContain("requestId,")
    expect(actionFlow).toContain("data?.clientRequestId !== requestId")
    expect(actionFlow).toContain("clearOrderSubmissionRequestId(requestId")
    expect(actionFlow.indexOf("data?.clientRequestId !== requestId"))
      .toBeLessThan(actionFlow.indexOf("clearOrderSubmissionRequestId(requestId"))
    expect(actionFlow.indexOf("clearOrderSubmissionRequestId(requestId"))
      .toBeLessThan(actionFlow.indexOf("clearCart()"))
  })
})
