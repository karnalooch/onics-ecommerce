import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const CURRENT_ACCOUNT_ENTRYPOINTS = [
  {
    path: "src/app/sklep/page.tsx",
    identityGateway: "buildStorefrontCatalogSnapshot",
  },
  {
    path: "src/app/(b2b)/dashboard/page.tsx",
    identityGateway: "findStoredUserBySession",
  },
  {
    path: "src/app/(b2b)/layout.tsx",
    identityGateway: "findStoredUserBySession",
  },
  {
    path: "src/app/admin/layout.tsx",
    identityGateway: "findStoredUserBySession",
  },
] as const

describe("current account identity wiring", () => {
  it("uses an approved stable-identity gateway in protected page entrypoints", () => {
    const offenders: string[] = []

    for (const entrypoint of CURRENT_ACCOUNT_ENTRYPOINTS) {
      const source = fs.readFileSync(
        path.join(process.cwd(), entrypoint.path),
        "utf8"
      )

      if (!source.includes(entrypoint.identityGateway)) {
        offenders.push(
          `${entrypoint.path}: does not use ${entrypoint.identityGateway}()`
        )
      }

      if (
        /(?:user|recordUser)\??\.id\s*===\s*sessionUser\.id/.test(source) ||
        /(?:user|recordUser)\??\.email[\s\S]{0,160}sessionUser\.email/.test(source)
      ) {
        offenders.push(
          `${entrypoint.path}: manually matches session id/email instead of using the stable resolver`
        )
      }
    }

    expect(offenders).toEqual([])
  })

  it("keeps the storefront gateway backed by the stable session resolver", () => {
    const storefrontContract = fs.readFileSync(
      path.join(process.cwd(), "src/lib/storefrontCatalog.ts"),
      "utf8"
    )

    expect(storefrontContract).toContain("findStoredUserBySession")
    expect(storefrontContract).not.toMatch(
      /(?:user|recordUser)\??\.email[\s\S]{0,160}sessionUser\.email/
    )
  })
})
