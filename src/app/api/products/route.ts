import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { authorizeAPI } from "@/lib/authUtils"
import { getKnowledge } from "@/lib/knowledge/parser"
import { calculateCustomerUnitPrice } from "@/lib/commerce"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  ensureManufacturerRecord,
  hasSkuConflict,
  type CatalogManufacturerRecord,
} from "@/lib/catalog"
import {
  hasInventoryLifecycleDependencyForProduct,
  shouldDeferProductStockWrite,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"

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
    ? findStoredUserBySession(users as StoredUser[], sessionUser)
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

  if (importRequest?.success) {
    logImport(`--- START IMPORT (${importRequest.data.items.length} pozycji) ---`)

    try {
      const result = await mutateMockData((db) => {
        const productStore = db.products as ProductRecord[]
        const categoryStore = db.categories as CategoryRecord[]
        const manufacturerStore =
          db.manufacturers as CatalogManufacturerRecord[]
        const productBySku = new Map(
          productStore.map((product) => [normalize(product.sku), product] as const)
        )
        const productByName = new Map(
          productStore.map((product) => [normalize(product.name), product] as const)
        )
        const categoryByName = new Map(
          categoryStore.map((category) => [normalize(category.name), category] as const)
        )
        const categoryById = new Map(
          categoryStore.map((category) => [String(category.id), category] as const)
        )
        let updatedCount = 0
        let addedCount = 0
        let deferredStockCount = 0

        for (const item of importRequest.data.items) {
          const sku = normalize(item.sku)
          if (!sku) continue

          let existing = productBySku.get(sku)
          if (!existing && item.name) {
            existing = productByName.get(normalize(item.name))
          }

          let categoryId = item.categoryId ?? null
          let subcategoryId = item.subcategoryId ?? null

          if (item.manufacturer) {
            ensureManufacturerRecord(
              manufacturerStore,
              item.manufacturer,
              `m_auto_${crypto.randomUUID()}`
            )
          }

          if (item.isNewCategory && item.xlsCategoryName) {
            const normalizedCategoryName = normalize(item.xlsCategoryName)
            let category = categoryByName.get(normalizedCategoryName)
            if (!category) {
              category = {
                id: `c_auto_${crypto.randomUUID()}`,
                name: item.xlsCategoryName.toUpperCase(),
                iconName: "Layers",
                subcategories: [],
              }
              categoryStore.push(category)
              categoryByName.set(normalizedCategoryName, category)
              categoryById.set(String(category.id), category)
            }
            categoryId = category.id
          }

          if (item.isNewSubcategory && item.xlsSubcategoryName && categoryId) {
            const category = categoryById.get(String(categoryId))
            if (category) {
              let subcategory = category.subcategories.find(
                (candidate) =>
                  normalize(candidate.name) ===
                  normalize(item.xlsSubcategoryName)
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
            if (item.stock !== undefined) {
              if (
                shouldDeferProductStockWrite(
                  db.orders as InventoryReservationOrder[],
                  String(existing.id),
                  existing.stock,
                  item.stock
                )
              ) {
                deferredStockCount += 1
              } else {
                existing.stock = item.stock
              }
            }
            if (item.manufacturer) existing.manufacturer = item.manufacturer
            if (categoryId) {
              existing.categoryId = categoryId
              existing.subcategoryId = subcategoryId
            }
            updatedCount += 1
          } else {
            const newProduct = {
              ...item,
              id: `p_${crypto.randomUUID()}`,
              sku: item.sku || "",
              name: item.name || item.sku || "Produkt",
              categoryId,
              subcategoryId,
              seoDescription: "",
            } as ProductRecord
            productStore.push(newProduct)
            productBySku.set(normalize(newProduct.sku), newProduct)
            productByName.set(normalize(newProduct.name), newProduct)
            addedCount += 1
          }
        }

        return { updatedCount, addedCount, deferredStockCount }
      })

      logImport(
        `--- KONIEC IMPORTU (Zaktualizowano: ${result.updatedCount}, Dodano: ${result.addedCount}, Stock odroczony: ${result.deferredStockCount}) ---`
      )
      return NextResponse.json({ success: true, ...result })
    } catch (error) {
      console.error("WF-Mag import persistence error:", error)
      return NextResponse.json(
        { error: "Nie udało się utrwalić importu." },
        { status: 500 }
      )
    }
  }

  const parsed = ProductInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane produktu." },
      { status: 400 }
    )
  }

  try {
    const newProduct = await mutateMockData((db) => {
      const productStore = db.products as ProductRecord[]
      if (hasSkuConflict(productStore, parsed.data.sku)) {
        throw new Error("SKU_EXISTS")
      }

      const product: ProductRecord = {
        ...parsed.data,
        id: `p_${crypto.randomUUID()}`,
      } as ProductRecord
      productStore.push(product)
      return product
    })

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "SKU_EXISTS") {
      return NextResponse.json(
        { error: "Produkt z tym SKU już istnieje." },
        { status: 409 }
      )
    }

    console.error("Product create persistence error:", error)
    return NextResponse.json(
      { error: "Nie udało się zapisać produktu." },
      { status: 500 }
    )
  }
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

  try {
    const updated = await mutateMockData((db) => {
      const productStore = db.products as ProductRecord[]
      const index = productStore.findIndex(
        (product) => product.id === parsed.data.id
      )

      if (index === -1) throw new Error("PRODUCT_NOT_FOUND")
      if (hasSkuConflict(productStore, parsed.data.sku, parsed.data.id)) {
        throw new Error("SKU_EXISTS")
      }
      if (
        shouldDeferProductStockWrite(
          db.orders as InventoryReservationOrder[],
          parsed.data.id,
          productStore[index].stock,
          parsed.data.stock
        )
      ) {
        throw new Error("PRODUCT_STOCK_RESERVED")
      }

      productStore[index] = {
        ...productStore[index],
        ...parsed.data,
      }
      return productStore[index]
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono produktu." },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message === "SKU_EXISTS") {
      return NextResponse.json(
        { error: "Produkt z tym SKU już istnieje." },
        { status: 409 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "PRODUCT_STOCK_RESERVED"
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można zmienić stanu produktu podczas aktywnej rezerwacji płatności Stripe.",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Nie udało się zapisać produktu." },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const id = new URL(req.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Brak ID produktu." }, { status: 400 })
  }

  try {
    await mutateMockData((db) => {
      const productStore = db.products as ProductRecord[]
      const index = productStore.findIndex((product) => product.id === id)
      if (index === -1) throw new Error("PRODUCT_NOT_FOUND")
      if (
        hasInventoryLifecycleDependencyForProduct(
          db.orders as InventoryReservationOrder[],
          id
        )
      ) {
        throw new Error("PRODUCT_HAS_INVENTORY_LIFECYCLE")
      }
      productStore.splice(index, 1)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Nie znaleziono produktu." },
        { status: 404 }
      )
    }
    if (
      error instanceof Error &&
      error.message === "PRODUCT_HAS_INVENTORY_LIFECYCLE"
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można usunąć produktu, dopóki istniejące zamówienie może jeszcze wymagać release/refund/RMA magazynu.",
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
