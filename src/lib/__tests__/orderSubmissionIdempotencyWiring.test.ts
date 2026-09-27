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
    expect(route).toContain("sameOrderSubmissionItems(")
    expect(route).toContain("clientRequestId: parsed.data.requestId")
    expect(route.indexOf("order.clientRequestId === parsed.data.requestId"))
      .toBeLessThan(route.indexOf("reserveInventory("))
  })

  it("reuses a pending browser key and clears it only after a matching success", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("getOrCreateOrderSubmissionRequestId(")
    expect(page).toContain("requestId,")
    expect(page).toContain("data?.clientRequestId !== requestId")
    expect(page).toContain("clearOrderSubmissionRequestId(requestId")
    expect(page.indexOf("data?.clientRequestId !== requestId"))
      .toBeLessThan(page.indexOf("clearOrderSubmissionRequestId(requestId"))
    expect(page.indexOf("clearOrderSubmissionRequestId(requestId"))
      .toBeLessThan(page.indexOf("clearCart()"))
  })
})
