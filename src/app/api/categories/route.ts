import { NextResponse } from "next/server"
import { z } from "zod"
import { mutateMockData, readServerData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"

export const dynamic = "force-dynamic"

type Subcategory = { id: string; name: string }
type Category = {
  id: string
  name: string
  iconName?: string
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

function normalizeSubcategories(
  values: z.infer<typeof SubcategoryInput>[] = []
): Subcategory[] {
  return values.map((value) =>
    typeof value === "string"
      ? { id: `s_${crypto.randomUUID()}`, name: value }
      : {
          id: value.id || `s_${crypto.randomUUID()}`,
          name: value.name,
        }
  )
}

export async function GET() {
  const { categories } = await readServerData()
  return NextResponse.json(categories)
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
    const newCategory = await mutateMockData((db) => {
      const categoryStore = db.categories as Category[]
      const category: Category = {
        id: `c_${crypto.randomUUID()}`,
        name: parsed.data.name.toUpperCase(),
        iconName: parsed.data.iconName || "Folder",
        subcategories: normalizeSubcategories(parsed.data.subcategories),
      }

      categoryStore.push(category)
      return category
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Nie udało się zapisać kategorii." },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = CategoryInput.extend({
    id: z.string().trim().min(1),
  }).safeParse(await req.json())

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowa kategoria." },
      { status: 400 }
    )
  }

  try {
    const updated = await mutateMockData((db) => {
      const categoryStore = db.categories as Category[]
      const index = categoryStore.findIndex(
        (category) => category.id === parsed.data.id
      )

      if (index === -1) throw new Error("CATEGORY_NOT_FOUND")

      const current = categoryStore[index]
      const nextCategory: Category = {
        ...current,
        name: parsed.data.name.toUpperCase(),
        iconName: parsed.data.iconName || current.iconName || "Folder",
        subcategories: parsed.data.subcategories
          ? normalizeSubcategories(parsed.data.subcategories)
          : current.subcategories,
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

    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }
}
