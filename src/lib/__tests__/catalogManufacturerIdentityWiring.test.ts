import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("catalog manufacturer identity wiring", () => {
  it("fails WF-Mag import closed before product mutation when persisted manufacturer names are ambiguous", () => {
    const route = read("src/app/api/products/route.ts")
    const start = route.indexOf("if (importRequest?.success)")
    const end = route.indexOf("const parsed = CatalogProductInputSchema.safeParse", start)
    const flow = route.slice(start, end)

    expect(flow).toContain(
      "const manufacturerByName =\n          indexCatalogManufacturersByName(manufacturerStore)"
    )
    expect(flow).toContain("CATALOG_DUPLICATE_MANUFACTURER_NAME")
    expect(flow).toContain("{ status: 409 }")
    expect(flow.indexOf("indexCatalogManufacturersByName(manufacturerStore)"))
      .toBeLessThan(flow.indexOf("for (const item of importRequest.data.items)"))
    expect(flow.indexOf("indexCatalogManufacturersByName(manufacturerStore)"))
      .toBeLessThan(flow.indexOf("productStore.push(newProduct)"))
  })

  it("reuses one strict manufacturer index for the full import batch", () => {
    const route = read("src/app/api/products/route.ts")
    const start = route.indexOf("if (importRequest?.success)")
    const end = route.indexOf("const parsed = CatalogProductInputSchema.safeParse", start)
    const flow = route.slice(start, end)

    expect(flow).toContain(
      "ensureManufacturerRecord(\n              manufacturerStore,"
    )
    expect(flow).toContain("manufacturerByName\n            )")
    expect(flow.match(/indexCatalogManufacturersByName\(manufacturerStore\)/g))
      .toHaveLength(1)
  })
})
