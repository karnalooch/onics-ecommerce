import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("catalog category identity wiring", () => {
  it("replays only an identical API create and rejects same-name conflicts", () => {
    const route = read("src/app/api/categories/route.ts")
    const start = route.indexOf("export async function POST")
    const end = route.indexOf("export async function PUT", start)
    const flow = route.slice(start, end)

    expect(flow).toContain("indexCatalogCategoriesByName(categoryStore)")
    expect(flow).toContain("normalizeCatalogCategoryName(parsed.data.name)")
    expect(flow).toContain("isCatalogCategoryCreateReplay(existing")
    expect(flow).toContain('throw new Error("CATEGORY_NAME_EXISTS")')
    expect(flow).toContain('"Idempotency-Replayed": "true"')
    expect(flow.indexOf("indexCatalogCategoriesByName(categoryStore)"))
      .toBeLessThan(flow.indexOf("categoryStore.push(category)"))
  })

  it("keeps the admin action retry safe without millisecond ids", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const start = actions.indexOf("export async function addCategoryAction")
    const end = actions.indexOf("export async function updateCategoryAction", start)
    const flow = actions.slice(start, end)

    expect(flow).toContain("indexCatalogCategoriesByName(categories)")
    expect(flow).toContain("isCatalogCategoryCreateReplay(existing")
    expect(flow).toContain("crypto.randomUUID()")
    expect(flow).not.toContain("Date.now()")
    expect(flow.indexOf("indexCatalogCategoriesByName(categories)"))
      .toBeLessThan(flow.indexOf("categories.push(category)"))
  })

  it("rejects rename collisions in both API and server-action paths", () => {
    const route = read("src/app/api/categories/route.ts")
    const actions = read("src/app/admin/categories/_actions.ts")

    expect(route).toContain("hasCatalogCategoryNameConflict(")
    expect(route).toContain('throw new Error("CATEGORY_NAME_EXISTS")')
    expect(actions).toContain("hasCatalogCategoryNameConflict(")
    expect(actions).toContain('throw new Error("CATEGORY_NAME_EXISTS")')
  })

  it("fails WF-Mag import closed on an ambiguous persisted category registry", () => {
    const route = read("src/app/api/products/route.ts")

    expect(route).toContain(
      "const categoryByName = indexCatalogCategoriesByName(categoryStore)"
    )
    expect(route).toContain("CATALOG_DUPLICATE_CATEGORY_NAME")
  })
})
