import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("operations UI architecture", () => {
  it("isolates operational routes from public storefront chrome", () => {
    const chrome = read("src/components/shell/AppChrome.tsx")

    expect(chrome).toContain('pathname.startsWith("/admin")')
    expect(chrome).toContain('pathname.startsWith("/field")')
    expect(chrome).toContain('pathname.startsWith("/dashboard")')
  })

  it("keeps the admin shell free of legacy support-card and mica wrappers", () => {
    const layout = read("src/app/admin/layout.tsx")

    expect(layout).not.toContain("SupportCard")
    expect(layout).not.toContain("glass-mica")
    expect(layout).not.toContain("fluent-card")
    expect(layout).toContain("AdminNavigation")
  })

  it("keeps the admin home operational rather than sales-analytics driven", () => {
    const page = read("src/app/admin/page.tsx")

    expect(page).toContain("Kolejka uwagi")
    expect(page).toContain("Integralność bazy wiedzy")
    expect(page).not.toContain("TrendingUp")
    expect(page.toLowerCase()).not.toContain("revenue")
  })

  it("documents the no-fabrication rule for field procedures", () => {
    const docs = read("docs/ui-architecture.md")

    expect(docs).toContain("must not fabricate installation procedures")
    expect(docs).toContain("Admin / operations")
  })
})
