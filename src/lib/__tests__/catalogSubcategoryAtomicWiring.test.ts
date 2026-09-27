import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("catalog subcategory atomic wiring", () => {
  it("removes whole-array subcategory mutation from the generic category action", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const start = actions.indexOf("const CategoryUpdateSchema")
    const end = actions.indexOf("const AddSubcategorySchema", start)
    const schema = actions.slice(start, end)

    expect(schema).toContain(".strict()")
    expect(schema).not.toContain("subcategories")
  })

  it("adds a subcategory under the write lock using fresh category state", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const start = actions.indexOf("export async function addSubcategoryAction")
    const end = actions.indexOf("export async function renameSubcategoryAction", start)
    const flow = actions.slice(start, end)

    expect(flow).toContain("mutateMockData((db)")
    expect(flow).toContain("indexCatalogSubcategoriesByName(subcategories)")
    expect(flow).toContain("crypto.randomUUID()")
    expect(flow).toContain("subcategories.push(subcategory)")
    expect(flow).not.toContain("Date.now()")
  })

  it("renames one subcategory instead of replacing the category snapshot", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const start = actions.indexOf("export async function renameSubcategoryAction")
    const end = actions.indexOf("export async function deleteSubcategoryAction", start)
    const flow = actions.slice(start, end)

    expect(flow).toContain("hasCatalogSubcategoryNameConflict(")
    expect(flow).toContain("subcategory.name = validated.data.name")
    expect(flow).not.toContain("category.subcategories = validated.data")
  })

  it("makes delete idempotent and protects referenced subcategories", () => {
    const actions = read("src/app/admin/categories/_actions.ts")
    const start = actions.indexOf("export async function deleteSubcategoryAction")
    const end = actions.indexOf("export async function deleteCategoryAction", start)
    const flow = actions.slice(start, end)

    expect(flow).toContain("if (index === -1)")
    expect(flow).toContain("return { replayed: true }")
    expect(flow).toContain("hasSubcategoryProductReference(")
    expect(flow.indexOf("hasSubcategoryProductReference("))
      .toBeLessThan(flow.indexOf("subcategories.splice(index, 1)"))
  })

  it("wires the admin UI exclusively to atomic subcategory actions", () => {
    const client = read(
      "src/app/admin/categories/CategoriesDashboardClient.tsx"
    )

    expect(client).toContain("addSubcategoryAction(activeCat.id, newSubcatName)")
    expect(client).toContain("renameSubcategoryAction(activeCat.id, id, name)")
    expect(client).toContain("deleteSubcategoryAction(activeCat.id, subId)")
    expect(client).not.toContain("id: `s${Date.now()}`")
    expect(client).not.toContain(
      "subcategories: activeCat.subcategories.map"
    )
    expect(client).not.toContain(
      "const subcategories = (activeCat.subcategories || []).filter"
    )
  })
})
