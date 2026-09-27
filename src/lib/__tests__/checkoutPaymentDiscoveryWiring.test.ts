import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("checkout payment discovery response wiring", () => {
  it("validates payment discovery before enabling transactional UI", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src/app/koszyk/page.tsx"),
      "utf8"
    )

    expect(page).toContain("validateCheckoutPaymentDiscovery(data)")
    expect(page).toContain("setPaymentMethods(discovery.methods)")
    expect(page).toContain("const controlEnabled = discovery.control.enabled")
    expect(page).not.toContain("setPaymentMethods(data?.methods ?? [])")
    expect(page).not.toContain("data?.control?.enabled !== false")
  })
})
