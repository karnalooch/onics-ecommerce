import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("catalog product revision fencing", () => {
  it("rechecks current admin access in every catalog product mutation", () => {
    const route = read("src/app/api/products/route.ts")
    const mutationCount = (route.match(/mutateMockData\(\(db\) =>/g) || []).length
    const fenceCount = (
      route.match(
        /assertCurrentAdminAccess\(db\.users as StoredActor\[\], authCheck\.user\)/g
      ) || []
    ).length

    expect(mutationCount).toBe(4)
    expect(fenceCount).toBe(mutationCount)
    expect(route).toContain('throw new Error("ADMIN_ACCESS_REVOKED")')
    expect(route).toContain("catalogAdminAccessErrorResponse(error)")
  })

  it("publishes normalized revisions and requires a PUT precondition", () => {
    const route = read("src/app/api/products/route.ts")
    const input = read("src/lib/catalogProductInput.ts")

    expect(route).toContain(
      "revision: catalogProductRevision(product.revision)"
    )
    expect(input).toContain("expectedRevision:")
    expect(route).toContain(
      "parsed.data.expectedRevision === undefined"
    )
    expect(route).toContain("{ status: 428 }")
  })

  it("checks revision before product mutation and supports exact replay", () => {
    const route = read("src/app/api/products/route.ts")
    const start = route.indexOf("export async function PUT")
    const end = route.indexOf("export async function DELETE", start)
    const flow = route.slice(start, end)

    expect(flow).toContain("expectedRevision !== currentRevision")
    expect(flow).toContain("isCatalogProductUpdateReplay(")
    expect(flow).toContain('throw new Error("PRODUCT_REVISION_CONFLICT")')
    expect(flow).toContain(
      "revision: nextCatalogProductRevision(currentRevision)"
    )
    expect(flow).toContain('"Idempotency-Replayed": "true"')
    expect(flow.indexOf("expectedRevision !== currentRevision"))
      .toBeLessThan(flow.indexOf("productStore[index] = nextProduct"))
  })

  it("fences destructive deletes by the displayed revision", () => {
    const route = read("src/app/api/products/route.ts")
    const dashboard = read(
      "src/app/admin/products/ProductsDashboardClient.tsx"
    )
    const row = read(
      "src/app/admin/products/_components/ProductTableRow.tsx"
    )

    expect(route).toContain(
      'url.searchParams.get("expectedRevision")'
    )
    expect(route).toContain(
      "catalogProductRevision(product.revision) !== parsedRevision.data"
    )
    expect(dashboard).toContain("expectedRevision")
    expect(dashboard).toContain("&expectedRevision=")
    expect(row).toContain("Number(p.revision ?? 0)")
    expect(route).toContain("if (index === -1) return { replayed: true }")
    expect(route).toContain('"Idempotency-Replayed": "true"')
    expect(route).not.toContain(
      'error.message === "PRODUCT_NOT_FOUND"'
    )
  })

  it("binds server-rendered admin edits to the observed revision", () => {
    const page = read("src/app/admin/products/[id]/page.tsx")

    expect(page).toContain('name="expectedRevision"')
    expect(page).toContain("catalogProductRevision(product.revision)")
    expect(page).toContain("expectedRevision !== currentRevision")
    expect(page).toContain(
      "revision: nextCatalogProductRevision(currentRevision)"
    )
  })

  it("advances revisions for import, AI and inventory side writers", () => {
    const products = read("src/app/api/products/route.ts")
    const ai = read("src/app/api/products/ai-description/route.ts")
    const inventory = read("src/lib/inventoryReservations.ts")

    expect(products).toContain("isCatalogProductStateEqual(beforeUpdate")
    expect(products).toContain(
      "existing.revision = nextCatalogProductRevision("
    )
    expect(ai).toContain(
      "catalogProductRevision(currentProduct.revision) !== initialRevision"
    )
    expect(ai).toContain(
      "currentProduct.revision = nextCatalogProductRevision(initialRevision)"
    )
    expect(inventory).toContain("function applyStockChange")
    expect(inventory).toContain(
      "product.revision = nextCatalogProductRevision(product.revision)"
    )
  })
})
