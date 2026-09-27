import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("AI description authorization fence", () => {
  it("revalidates the current admin account inside the write transaction", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/products/ai-description/route.ts"
      ),
      "utf8"
    )

    const writeStart = source.indexOf("await mutateMockData((db) =>")
    const flow = source.slice(writeStart)

    expect(writeStart).toBeGreaterThan(-1)
    expect(flow).toContain("findStoredUserBySession(")
    expect(flow).toContain("hasAccountRoleAccess(currentActor, [\"ADMIN\"])")
    expect(flow).toContain('throw new Error("ADMIN_ACCESS_REVOKED")')
    expect(flow.indexOf("hasAccountRoleAccess(")).toBeLessThan(
      flow.indexOf("currentProduct.seoDescription = generatedDescription")
    )
  })
})
