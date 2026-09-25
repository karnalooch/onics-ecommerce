import { NextResponse } from "next/server"
import { z } from "zod"
import { initializeMockData, saveMockData } from "@/store/serverStore"
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
  const { categories } = initializeMockData()
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

  const { categories } = initializeMockData()
  const categoryStore = categories as Category[]
  const newCategory: Category = {
    id: `c_${crypto.randomUUID()}`,
    name: parsed.data.name.toUpperCase(),
    iconName: parsed.data.iconName || "Folder",
    subcategories: normalizeSubcategories(parsed.data.subcategories),
  }

  categoryStore.push(newCategory)
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać kategorii." },
      { status: 500 }
    )
  }
  return NextResponse.json(newCategory, { status: 201 })
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

  const { categories } = initializeMockData()
  const categoryStore = categories as Category[]
  const index = categoryStore.findIndex(
    (category) => category.id === parsed.data.id
  )

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono kategorii." }, { status: 404 })
  }

  const current = categoryStore[index]
  const updated: Category = {
    ...current,
    name: parsed.data.name.toUpperCase(),
    iconName: parsed.data.iconName || current.iconName || "Folder",
    subcategories: parsed.data.subcategories
      ? normalizeSubcategories(parsed.data.subcategories)
      : current.subcategories,
  }

  categoryStore[index] = updated
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać kategorii." },
      { status: 500 }
    )
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID kategorii." }, { status: 400 })
  }

  const { categories } = initializeMockData()
  const categoryStore = categories as Category[]
  const index = categoryStore.findIndex((category) => category.id === id)

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono kategorii." }, { status: 404 })
  }

  categoryStore.splice(index, 1)
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
