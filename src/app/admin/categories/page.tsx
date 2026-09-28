import { initializeMockData } from "@/store/serverStore"
import { CategoriesDashboardClient } from "./CategoriesDashboardClient"

type CategoryView = {
  id: string
  name: string
  iconName?: string
  revision?: number
  subcategories?: Array<{ id: string; name: string }>
}

function toCategoryView(input: Record<string, unknown>): CategoryView {
  const rawSubcategories = Array.isArray(input.subcategories)
    ? input.subcategories
    : []

  return {
    id: String(input.id ?? ""),
    name: String(input.name ?? ""),
    iconName:
      typeof input.iconName === "string" ? input.iconName : undefined,
    revision: Number.isSafeInteger(Number(input.revision))
      ? Number(input.revision)
      : 0,
    subcategories: rawSubcategories
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .map((item) => ({
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
      })),
  }
}

export default function CategoriesPage() {
  const { categories } = initializeMockData()

  return (
    <CategoriesDashboardClient
      initialCategories={categories.map((category) =>
        toCategoryView(category as Record<string, unknown>)
      )}
    />
  )
}
