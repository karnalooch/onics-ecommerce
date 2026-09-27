import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("catalog category revision fencing", () => {
  it("publishes normalized revisions and requires a PUT precondition", () => {
    const route = read("src/app/api/categories/route.ts")

    expect(route).toContain(
      "revision: catalogCategoryRevision(category.revision)"
    )
    expect(route).toContain("expectedRevision:")
    expect(route).toContain("{ status: 428 }")
  })

  it("checks revision before mutating category state and supports exact replay", () => {
    const route = read("src/app/api/categories/route.ts")
    const start = route.indexOf("export async function PUT")
    const end = route.indexOf("export async function DELETE", start)
    const flow = route.slice(start, end)

    expect(flow).toContain(
      "parsed.data.expectedRevision !== currentRevision"
    )
    expect(flow).toContain("isCategoryUpdateReplay(")
    expect(flow).toContain('throw new Error("CATEGORY_REVISION_CONFLICT")')
    expect(flow).toContain(
      "revision: nextCatalogCategoryRevision(currentRevision)"
    )
    expect(flow).toContain('"Idempotency-Replayed": "true"')
    expect(flow.indexOf("parsed.data.expectedRevision !== currentRevision"))
      .toBeLessThan(flow.indexOf("categoryStore[index] = nextCategory"))
  })

  it("reuses existing subcategory ids when retry payload omits them", () => {
    const route = read("src/app/api/categories/route.ts")
    const start = route.indexOf("function normalizeSubcategories")
    const end = route.indexOf("function sameSubcategoryState", start)
    const flow = route.slice(start, end)

    expect(flow).toContain("indexCatalogSubcategoriesByName(current)")
    expect(flow).toContain("requestedId || existing?.id ||")
    expect(flow).toContain("CATALOG_DUPLICATE_SUBCATEGORY_ID")
  })

  it("fences destructive API and admin deletes by observed revision", () => {
    const route = read("src/app/api/categories/route.ts")
    const actions = read("src/app/admin/categories/_actions.ts")
    const client = read(
      "src/app/admin/categories/CategoriesDashboardClient.tsx"
    )

    expect(route).toContain(
      'url.searchParams.get("expectedRevision")'
    )
    expect(route).toContain(
      "catalogCategoryRevision(category.revision) !== parsedRevision.data"
    )
    expect(actions).toContain(
      "catalogCategoryRevision(category.revision) !=="
    )
    expect(client).toContain(
      "deleteCategoryAction(id, expectedRevision)"
    )
  })

  it("advances revisions for non-API structural writers", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const products = read("src/app/api/products/route.ts")

    expect(actions).toContain(
      "revision: nextCatalogCategoryRevision(current.revision)"
    )
    expect(actions).toContain(
      "category.revision = nextCatalogCategoryRevision(category.revision)"
    )
    expect(products).toContain("revision: 0")
    expect(products).toContain(
      "category.revision = nextCatalogCategoryRevision("
    )
    expect(products).toContain(
      "indexCatalogSubcategoriesByName("
    )
    expect(products).toContain(
      "CATALOG_DUPLICATE_SUBCATEGORY_NAME"
    )
  })
})
