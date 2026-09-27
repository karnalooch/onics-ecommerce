import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("checkout payment response wiring", () => {
  it("validates the checkout payload before redirect, confirmation or cart clearing", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("validateCheckoutPaymentResponse(method.id, data)")
    expect(page).toContain("window.location.assign(checkout.nextAction.url)")
    expect(page).toContain("orderId: checkout.orderId")
    expect(page).toContain("fields: checkout.nextAction.fields")
    expect(page).not.toContain("window.location.assign(data.nextAction.url)")
  })
})
