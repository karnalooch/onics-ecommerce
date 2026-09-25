import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

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

  if (authCheck.currentRole === "ADMIN") {
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
    const newOrder = await mutateMockData((db) => {
      const storedUser = findStoredUser(db.users as StoredUser[], sessionUser)

      if (!storedUser) throw new Error("Konto nie istnieje.")
      if (storedUser.isBlocked) throw new Error("Konto jest zablokowane.")
      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("Konto B2B oczekuje na zatwierdzenie.")
      }

      const isHardOrder = parsed.data.orderType === "ORDER"
      const resolved = resolveCartItems(
        parsed.data.items,
        db.products,
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

      const order = {
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

      db.orders.unshift(order)
      return order
    })

    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd serwera."
    const status =
      message === "Konto nie istnieje."
        ? 401
        : /zablokowane|oczekuje na zatwierdzenie/.test(message)
          ? 403
          : /Nieprawidłowa ilość|nie istnieje w aktualnym katalogu|nie ma aktywnej ceny|Brak wymaganej ilości/.test(message)
            ? 409
            : 500

    return NextResponse.json({ error: message }, { status })
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

    const updatedOrder = await mutateMockData((db) => {
      const index = db.orders.findIndex(
        (order: { id?: string }) => order.id === parsed.data.id
      )

      if (index === -1) throw new Error("ORDER_NOT_FOUND")

      const currentOrder = db.orders[index]
      const items = parsed.data.items ?? currentOrder.items ?? []
      const totalPriceFinal =
        Math.round(
          (items.reduce(
            (sum: number, item: { price: number; quantity: number }) =>
              sum + item.price * item.quantity,
            0
          ) +
            Number.EPSILON) *
            100
        ) / 100

      const nextOrder = {
        ...currentOrder,
        status: parsed.data.status,
        estimatedDeliveryDays:
          parsed.data.estimatedDeliveryDays ??
          currentOrder.estimatedDeliveryDays ??
          null,
        items,
        totalPriceFinal,
        updatedAt: new Date().toISOString(),
      }

      db.orders[index] = nextOrder
      return nextOrder
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono zamówienia." }, { status: 404 })
    }

    const message = error instanceof Error ? error.message : "Błąd serwera."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
