import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("knowledge key validation request lifetime", () => {
  it("cancels the Gemini models request when the HTTP request is aborted", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/knowledge/validate-key/route.ts"
      ),
      "utf8"
    )

    expect(source).toContain("AbortSignal.any([")
    expect(source).toContain("req.signal,")
    expect(source).toContain("AbortSignal.timeout(10000)")
    expect(source).toContain("if (req.signal.aborted)")
    expect(source).toContain("{ status: 499 }")
  })
})
