import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("legacy WF-Mag import ingress", () => {
  it("rejects the unsupported flow without buffering its request body", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/admin/import/route.ts"),
      "utf8"
    )

    expect(source).toContain("safeEqual(authHeader, expectedHeader)")
    expect(source).toContain("{ status: 501 }")
    expect(source).not.toMatch(
      /req\.(?:text|json|formData|arrayBuffer)\s*\(/
    )
  })
})
