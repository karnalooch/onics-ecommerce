import { NextResponse } from "next/server"
import { z } from "zod"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"
import {
  catalogCategoryRevision,
  findRemovedReferencedSubcategoryIds,
  hasCatalogCategoryNameConflict,
  hasCategoryProductReference,
  indexCatalogCategoriesByName,
  indexCatalogSubcategoriesByName,
  isCatalogCategoryCreateReplay,
  nextCatalogCategoryRevision,
  normalizeCatalogCategoryName,
  normalizeCatalogSubcategoryName,
  type CatalogCategoryReference,
} from "@/lib/catalog"

export const dynamic = "force-dynamic"

type Subcategory = { id: string; name: string }
type Category = {
  id: string
  name: string
  iconName?: string
  revision?: number
  subcategories: Subcategory[]
}

const SubcategoryInput = z.union([
  z.string().trim().min(1).max(120),
  z.object({
    id: z.string().trim().optional(),
    name: z.string().trim().min(1).max(120),
  }),
])

const CategoryInput = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1).max(120),
  iconName: z.string().trim().max(80).optional(),
  subcategories: z.array(SubcategoryInput).max(500).optional(),
})

const CategoryUpdateInput = CategoryInput.extend({
  id: z.string().trim().min(1),
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
})

function normalizeSubcategories(
  values: z.infer<typeof SubcategoryInput>[] = [],
  current: Subcategory[] = []
): Subcategory[] {
  const currentByName = indexCatalogSubcategoriesByName(current)
  const normalized = values.map((value) => {
    const name = typeof value === "string" ? value : value.name
    const requestedId = typeof value === "string" ? undefined : value.id
    const existing = currentByName.get(
      normalizeCatalogSubcategoryName(name)
    )

    return {
      id: requestedId || existing?.id || `s_${crypto.randomUUID()}`,
      name,
    }
  })

  indexCatalogSubcategoriesByName(normalized)

  const ids = new Set<string>()
  for (const subcategory of normalized) {
    if (ids.has(subcategory.id)) {
      throw new Error("CATALOG_DUPLICATE_SUBCATEGORY_ID")
    }
    ids.add(subcategory.id)
  }

  return normalized
}

function sameSubcategoryState(
  current: Subcategory[],
  requested: Subcategory[]
) {
  return (
    current.length === requested.length &&
    current.every(
      (subcategory, index) =>
        subcategory.id === requested[index]?.id &&
        normalizeCatalogSubcategoryName(subcategory.name) ===
          normalizeCatalogSubcategoryName(requested[index]?.name)
    )
  )
}

function isCategoryUpdateReplay(
  current: Category,
  data: z.infer<typeof CategoryUpdateInput>,
  nextSubcategories: Subcategory[]
) {
  if (
    normalizeCatalogCategoryName(current.name) !==
    normalizeCatalogCategoryName(data.name)
  ) {
    return false
  }

  const currentIcon = String(current.iconName || "Folder").trim() || "Folder"
  const requestedIcon =
    String(data.iconName || current.iconName || "Folder").trim() || "Folder"
  if (currentIcon !== requestedIcon) return false

  return data.subcategories
    ? sameSubcategoryState(current.subcategories || [], nextSubcategories)
    : true
}

export async function GET() {
  const { categories } = initializeMockData()
  return NextResponse.json(
    (categories as Category[]).map((category) => ({
      ...category,
      revision: catalogCategoryRevision(category.revision),
    }))
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = CategoryInput.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowa kategoria." },
      { status: 400 }
    )
  }

  try {
    const submission = await mutateMockData((db) => {
      const categoryStore = db.categories as Category[]
      const byName = indexCatalogCategoriesByName(categoryStore)
      const existing = byName.get(
        normalizeCatalogCategoryName(parsed.data.name)
      )
      if (existing) {
        const requestedSubcategories = (parsed.data.subcategories || []).map(
          (subcategory) => ({
            name:
              typeof subcategory === "string"
                ? subcategory
                : subcategory.name,
          })
        )
        if (
          !isCatalogCategoryCreateReplay(existing, {
            name: parsed.data.name,
            iconName: parsed.data.iconName || "Folder",
            subcategories: requestedSubcategories,
          })
        ) {
          throw new Error("CATEGORY_NAME_EXISTS")
        }
        return { category: existing, replayed: true }
      }

      const category: Category = {
        id: `c_${crypto.randomUUID()}`,
        name: parsed.data.name.toUpperCase(),
        iconName: parsed.data.iconName || "Folder",
        revision: 0,
        subcategories: normalizeSubcategories(parsed.data.subcategories),
      }

      categoryStore.push(category)
      return { category, replayed: false }
    })

    return NextResponse.json(submission.category, {
      status: submission.replayed ? 200 : 201,
      headers: submission.replayed
        ? { "Idempotency-Replayed": "true" }
        : undefined,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CATEGORY_NAME_EXISTS"
    ) {
      return NextResponse.json(
        { error: "Kategoria o tej nazwie już istnieje z inną konfiguracją." },
        { status: 409 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "CATALOG_DUPLICATE_CATEGORY_NAME"
    ) {
      return NextResponse.json(
        {
          error:
            "Katalog zawiera zduplikowane nazwy kategorii. Usuń konflikt przed kolejną zmianą.",
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Nie udało się zapisać kategorii." },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = CategoryUpdateInput.safeParse(await req.json())

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowa kategoria." },
      { status: 400 }
    )
  }

  if (parsed.data.expectedRevision === undefined) {
    return NextResponse.json(
      {
        error:
          "Aktualizacja kategorii wymaga expectedRevision z ostatniego odczytu.",
      },
      { status: 428 }
    )
  }

  try {
    const updated = await mutateMockData((db) => {
      const categoryStore = db.categories as Category[]
      const index = categoryStore.findIndex(
        (category) => category.id === parsed.data.id
      )

      if (index === -1) throw new Error("CATEGORY_NOT_FOUND")
      indexCatalogCategoriesByName(categoryStore)
      if (
        hasCatalogCategoryNameConflict(
          categoryStore,
          parsed.data.name,
          parsed.data.id
        )
      ) {
        throw new Error("CATEGORY_NAME_EXISTS")
      }

      const current = categoryStore[index]
      const nextSubcategories = parsed.data.subcategories
        ? normalizeSubcategories(parsed.data.subcategories)
        : current.subcategories

      if (parsed.data.subcategories) {
        const removedReferencedSubcategoryIds =
          findRemovedReferencedSubcategoryIds(
            db.products as CatalogCategoryReference[],
            parsed.data.id,
            nextSubcategories.map((subcategory) => subcategory.id)
          )

        if (removedReferencedSubcategoryIds.length > 0) {
          throw new Error("CATEGORY_SUBCATEGORY_IN_USE")
        }
      }

      const nextCategory: Category = {
        ...current,
        name: parsed.data.name.toUpperCase(),
        iconName: parsed.data.iconName || current.iconName || "Folder",
        subcategories: nextSubcategories,
      }

      categoryStore[index] = nextCategory
      return nextCategory
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono kategorii." },
        { status: 404 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "CATEGORY_NAME_EXISTS"
    ) {
      return NextResponse.json(
        { error: "Kategoria o tej nazwie już istnieje." },
        { status: 409 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "CATALOG_DUPLICATE_CATEGORY_NAME"
    ) {
      return NextResponse.json(
        {
          error:
            "Katalog zawiera zduplikowane nazwy kategorii. Usuń konflikt przed kolejną zmianą.",
        },
        { status: 409 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "CATEGORY_SUBCATEGORY_IN_USE"
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można usunąć podkategorii przypisanej do produktu. Najpierw przenieś produkty do innej podkategorii.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać kategorii." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID kategorii." }, { status: 400 })
  }

  try {
    await mutateMockData((db) => {
      const categoryStore = db.categories as Category[]
      const index = categoryStore.findIndex((category) => category.id === id)

      if (index === -1) throw new Error("CATEGORY_NOT_FOUND")
      if (
        hasCategoryProductReference(
          db.products as CatalogCategoryReference[],
          id
        )
      ) {
        throw new Error("CATEGORY_IN_USE")
      }
      categoryStore.splice(index, 1)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono kategorii." },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message === "CATEGORY_IN_USE") {
      return NextResponse.json(
        {
          error:
            "Nie można usunąć kategorii przypisanej do produktów. Najpierw przenieś produkty do innej kategorii.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }
}
