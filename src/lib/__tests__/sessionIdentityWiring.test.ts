import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const CURRENT_ACCOUNT_ENTRYPOINTS = [
  "src/app/sklep/page.tsx",
  "src/app/(b2b)/layout.tsx",
  "src/app/admin/layout.tsx",
] as const

describe("current account identity wiring", () => {
  it("uses the stable session identity resolver in protected page entrypoints", () => {
    const offenders: string[] = []

    for (const relativePath of CURRENT_ACCOUNT_ENTRYPOINTS) {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")

      if (!source.includes("findStoredUserBySession")) {
        offenders.push(`${relativePath}: does not use findStoredUserBySession()`)
      }

      if (
        /user\.id\s*===\s*sessionUser\.id/.test(source) ||
        /user\.email[^\n]*sessionUser\.email/.test(source)
      ) {
        offenders.push(
          `${relativePath}: manually matches session id/email instead of using the stable resolver`
        )
      }
    }

    expect(offenders).toEqual([])
  })
})
