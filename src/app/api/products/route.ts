import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { initializeMockData, saveMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"
import { getKnowledge } from "@/lib/knowledge/parser"
import { calculateCustomerUnitPrice } from "@/lib/commerce"

export const dynamic = "force-dynamic"

type ProductRecord = {
  id: string
  sku: string
  name: string
  price?: number | null
  stock?: number | null
  manufacturer?: string
  categoryId?: string | null
  subcategoryId?: string | null
  seoDescription?: string
  catalogPrice?: number | null
  catalogSpecs?: string
  isVirtual?: boolean
  isIqSynced?: boolean
  [key: string]: unknown
}

type Subcategory = { id: string; name: string }
type CategoryRecord = {
  id: string
  name: string
  iconName?: string
  subcategories: Subcategory[]
}

type StoredUser = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number
}

const ImportItemSchema = z
  .object({
    sku: z.string().trim().optional(),
    name: z.string().trim().optional(),
    price: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().min(0).optional(),
    manufacturer: z.string().trim().optional(),
    categoryId: z.string().trim().nullable().optional(),
    subcategoryId: z.string().trim().nullable().optional(),
    isNewCategory: z.boolean().optional(),
    isNewSubcategory: z.boolean().optional(),
    xlsCategoryName: z.string().trim().optional(),
    xlsSubcategoryName: z.string().trim().optional(),
  })
  .passthrough()

const ProductInputSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().trim().min(1),
    name: z.string().trim().min(2),
    price: z.coerce.number().min(0).nullable().optional(),
    stock: z.coerce.number().min(0).optional(),
    manufacturer: z.string().trim().optional(),
    categoryId: z.string().trim().nullable().optional(),
    subcategoryId: z.string().trim().nullable().optional(),
    seoDescription: z.string().max(5000).optional(),
  })
  .passthrough()

const ImportRequestSchema = z.object({
  action: z.literal("IMPORT_WFMAG"),
  items: z.array(ImportItemSchema).max(10000),
})

function logImport(message: string) {
  try {
    const logPath = path.join(process.cwd(), "import_debug.log")
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`)
  } catch {
    // Diagnostic logging must not break an import.
  }
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET() {
  const session = await auth()
  const { products, users } = initializeMockData()
  const productStore = products as ProductRecord[]

  let unifiedDevices: ProductRecord[]
  try {
    const store = await getKnowledge()
    const existingSkus = new Set(productStore.map((product) => normalize(product.sku)))

    const virtualDevices: ProductRecord[] = Object.keys(store.knowledge)
      .filter((key) => !existingSkus.has(normalize(key)))
      .map((key) => {
        const entry = store.knowledge[key]
        return {
          id: `virtual_${key}`,
          sku: key,
          name: entry.model || key,
          manufacturer: entry.manufacturer || "NIEZNANY",
          price: 0,
          catalogPrice: entry.price || 0,
          stock: 0,
          isVirtual: true,
          seoDescription: entry.specs || "",
          catalogSpecs: entry.specs || "",
        }
      })

    const enrichedProducts = productStore.map((product) => {
      const entry = store.knowledge[product.sku]
      if (!entry) return product

      return {
        ...product,
        manufacturer:
          product.manufacturer && product.manufacturer !== "NIEZNANY"
            ? product.manufacturer
            : entry.manufacturer || "NIEZNANY",
        catalogSpecs: entry.specs || "",
        catalogPrice: entry.price || 0,
        isIqSynced: true,
      }
    })

    unifiedDevices = [...enrichedProducts, ...virtualDevices]
  } catch {
    unifiedDevices = [...productStore]
  }

  const sessionUser = session?.user as
    | { id?: string; email?: string | null }
    | undefined
  const currentUser = sessionUser
    ? (users as StoredUser[]).find(
        (user) =>
          (sessionUser.id && user.id === sessionUser.id) ||
          (sessionUser.email &&
            normalize(user.email) === normalize(sessionUser.email))
      )
    : undefined
  const role = currentUser?.isBlocked ? undefined : currentUser?.roleType
  const canSeePrices =
    role === "ADMIN" || (role === "BIZ" && Boolean(currentUser?.isApproved))

  if (!canSeePrices) {
    return NextResponse.json(
      unifiedDevices.map((product) => ({
        ...product,
        price: null,
        catalogPrice: null,
        priceHidden: true,
      }))
    )
  }

  return NextResponse.json(
    unifiedDevices.map((product) => ({
      ...product,
      price:
        role === "BIZ"
          ? calculateCustomerUnitPrice(
              {
                id: product.id,
                sku: product.sku,
                name: product.name,
                price: Number(product.price ?? 0),
                stock: Number(product.stock ?? 0),
              },
              { role: "BIZ", discount: Number(currentUser?.discount ?? 0) }
            )
          : Number(product.price ?? 0),
      priceHidden: false,
    }))
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const body: unknown = await req.json()
  const isImportRequest =
    typeof body === "object" &&
    body !== null &&
    "action" in body &&
    (body as { action?: unknown }).action === "IMPORT_WFMAG"

  const importRequest = isImportRequest ? ImportRequestSchema.safeParse(body) : null

  if (importRequest && !importRequest.success) {
    return NextResponse.json(
      { error: importRequest.error.issues[0]?.message || "Nieprawidłowy import." },
      { status: 400 }
    )
  }

  const { products, categories } = initializeMockData()
  const productStore = products as ProductRecord[]
  const categoryStore = categories as CategoryRecord[]

  if (importRequest?.success) {
    let updatedCount = 0
    let addedCount = 0

    logImport(`--- START IMPORT (${importRequest.data.items.length} pozycji) ---`)

    for (const item of importRequest.data.items) {
      const sku = normalize(item.sku)
      if (!sku) continue

      let existing = productStore.find((product) => normalize(product.sku) === sku)
      if (!existing && item.name) {
        existing = productStore.find(
          (product) => normalize(product.name) === normalize(item.name)
        )
      }

      let categoryId = item.categoryId ?? null
      let subcategoryId = item.subcategoryId ?? null

      if (item.isNewCategory && item.xlsCategoryName) {
        let category = categoryStore.find(
          (candidate) => normalize(candidate.name) === normalize(item.xlsCategoryName)
        )
        if (!category) {
          category = {
            id: `c_auto_${crypto.randomUUID()}`,
            name: item.xlsCategoryName.toUpperCase(),
            iconName: "Layers",
            subcategories: [],
          }
          categoryStore.push(category)
        }
        categoryId = category.id
      }

      if (item.isNewSubcategory && item.xlsSubcategoryName && categoryId) {
        const category = categoryStore.find(
          (candidate) => candidate.id === categoryId
        )
        if (category) {
          let subcategory = category.subcategories.find(
            (candidate) =>
              normalize(candidate.name) === normalize(item.xlsSubcategoryName)
          )
          if (!subcategory) {
            subcategory = {
              id: `s_auto_${crypto.randomUUID()}`,
              name: item.xlsSubcategoryName,
            }
            category.subcategories.push(subcategory)
          }
          subcategoryId = subcategory.id
        }
      }

      if (existing) {
        if (item.price !== undefined) existing.price = item.price
        if (item.stock !== undefined) existing.stock = item.stock
        if (item.manufacturer) existing.manufacturer = item.manufacturer
        if (categoryId) {
          existing.categoryId = categoryId
          existing.subcategoryId = subcategoryId
        }
        updatedCount += 1
      } else {
        productStore.push({
          ...item,
          id: `p_${crypto.randomUUID()}`,
          sku: item.sku || "",
          name: item.name || item.sku || "Produkt",
          categoryId,
          subcategoryId,
          seoDescription: "",
        } as ProductRecord)
        addedCount += 1
      }
    }

    if (!saveMockData()) {
      return NextResponse.json(
        { error: "Nie udało się utrwalić importu." },
        { status: 500 }
      )
    }

    logImport(
      `--- KONIEC IMPORTU (Zaktualizowano: ${updatedCount}, Dodano: ${addedCount}) ---`
    )
    return NextResponse.json({ success: true, updatedCount, addedCount })
  }

  const parsed = ProductInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane produktu." },
      { status: 400 }
    )
  }

  const newProduct: ProductRecord = {
    ...parsed.data,
    id: `p_${crypto.randomUUID()}`,
  } as ProductRecord

  productStore.push(newProduct)
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać produktu." },
      { status: 500 }
    )
  }

  return NextResponse.json(newProduct, { status: 201 })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = ProductInputSchema.extend({
    id: z.string().min(1),
  }).safeParse(await req.json())

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane produktu." },
      { status: 400 }
    )
  }

  const { products } = initializeMockData()
  const productStore = products as ProductRecord[]
  const index = productStore.findIndex(
    (product) => product.id === parsed.data.id
  )

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono produktu." }, { status: 404 })
  }

  productStore[index] = {
    ...productStore[index],
    ...parsed.data,
  }

  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać produktu." },
      { status: 500 }
    )
  }

  return NextResponse.json(productStore[index])
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID produktu." }, { status: 400 })
  }

  const { products } = initializeMockData()
  const productStore = products as ProductRecord[]
  const index = productStore.findIndex((product) => product.id === id)

  if (index === -1) {
    return NextResponse.json({ error: "Nie znaleziono produktu." }, { status: 404 })
  }

  productStore.splice(index, 1)
  if (!saveMockData()) {
    return NextResponse.json(
      { error: "Nie udało się zapisać zmian." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
