import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { initializeMockData, saveMockData } from "@/store/serverStore"

export const dynamic = "force-dynamic"

const OrderItemInputSchema = z.object({
  id: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10000),
})

const CreateOrderSchema = z.object({
  orderType: z.enum(["INQUIRY", "ORDER"]),
  items: z.array(OrderItemInputSchema).min(1).max(250),
})

const AdminOrderItemSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10000),
  price: z.coerce.number().min(0).max(100000000),
})

const UpdateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "PENDING_VERIFICATION",
    "INQUIRY",
    "CONFIRMED",
    "SHIPPED",
    "CANCELLED",
  ]),
  estimatedDeliveryDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
  items: z.array(AdminOrderItemSchema).min(1).max(250).optional(),
})

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  nip?: string | null
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number
}

function findStoredUser(users: StoredUser[], sessionUser: SessionUser) {
  return users.find(
    (user) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        user.email?.toLowerCase() === sessionUser.email.toLowerCase())
  )
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { orders } = initializeMockData()

  if (sessionUser.role === "ADMIN") {
    return NextResponse.json(orders)
  }

  const ownOrders = orders.filter(
    (order: { user?: { id?: string; email?: string } }) =>
      (sessionUser.id && order.user?.id === sessionUser.id) ||
      (sessionUser.email &&
        order.user?.email?.toLowerCase() === sessionUser.email.toLowerCase())
  )

  return NextResponse.json(ownOrders)
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = CreateOrderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowe dane zamówienia." },
        { status: 400 }
      )
    }

    const sessionUser = authCheck.user as SessionUser
    const { users, products, orders } = initializeMockData()
    const storedUser = findStoredUser(users as StoredUser[], sessionUser)

    if (!storedUser) {
      return NextResponse.json({ error: "Konto nie istnieje." }, { status: 401 })
    }

    if (storedUser.isBlocked) {
      return NextResponse.json({ error: "Konto jest zablokowane." }, { status: 403 })
    }

    if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const isHardOrder = parsed.data.orderType === "ORDER"
    const resolved = resolveCartItems(
      parsed.data.items,
      products,
      {
        id: String(storedUser.id ?? ""),
        email: storedUser.email,
        role: storedUser.roleType,
        isApproved: storedUser.isApproved,
        isBlocked: storedUser.isBlocked,
        discount: storedUser.discount,
        nip: storedUser.nip,
      },
      {
        requirePriced: isHardOrder,
        requireStock: isHardOrder,
      }
    )

    const newOrder = {
      id: `ORD-${crypto.randomUUID()}`,
      orderType: parsed.data.orderType,
      createdAt: new Date().toISOString(),
      status: isHardOrder ? "PENDING_VERIFICATION" : "INQUIRY",
      estimatedDeliveryDays: null,
      totalPriceOrig: resolved.total,
      totalPriceFinal: resolved.total,
      items: resolved.items,
      user: {
        id: storedUser.id,
        email: storedUser.email,
        companyName: storedUser.companyName,
        nip: storedUser.nip ?? null,
      },
    }

    orders.unshift(newOrder)

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić zamówienia.")
    }

    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd serwera."
    const isBusinessError =
      /Nieprawidłowa ilość|nie istnieje|nie ma aktywnej ceny|Brak wymaganej ilości/.test(
        message
      )

    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 409 : 500 }
    )
  }
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = UpdateOrderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowa aktualizacja." },
        { status: 400 }
      )
    }

    const { orders } = initializeMockData()
    const index = orders.findIndex(
      (order: { id?: string }) => order.id === parsed.data.id
    )

    if (index === -1) {
      return NextResponse.json({ error: "Nie znaleziono zamówienia." }, { status: 404 })
    }

    const currentOrder = orders[index]
    const items = parsed.data.items ?? currentOrder.items ?? []
    const totalPriceFinal = Math.round(
      (items.reduce(
        (sum: number, item: { price: number; quantity: number }) =>
          sum + item.price * item.quantity,
        0
      ) +
        Number.EPSILON) *
        100
    ) / 100

    orders[index] = {
      ...currentOrder,
      status: parsed.data.status,
      estimatedDeliveryDays:
        parsed.data.estimatedDeliveryDays ?? currentOrder.estimatedDeliveryDays ?? null,
      items,
      totalPriceFinal,
      updatedAt: new Date().toISOString(),
    }

    if (!saveMockData()) {
      throw new Error("Nie udało się utrwalić aktualizacji.")
    }

    return NextResponse.json(orders[index])
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd serwera."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
