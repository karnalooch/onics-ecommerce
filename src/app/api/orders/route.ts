import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import {
  canReplaceOrderItems,
  resolveEstimatedDeliveryDays,
  validateStripeOrderStatusTransition,
} from "@/lib/orders"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

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

type StoredOrder = {
  id?: string
  status?: string
  estimatedDeliveryDays?: number | null
  items?: Array<z.infer<typeof AdminOrderItemSchema>>
  stripeCheckoutSessionId?: string | null
  paymentStatus?: string | null
  user?: {
    id?: string
    email?: string
    companyName?: string
    nip?: string | null
  }
  [key: string]: unknown
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { orders } = initializeMockData()
  const orderStore = orders as StoredOrder[]

  if (authCheck.currentRole === "ADMIN") {
    return NextResponse.json(orderStore)
  }

  const ownOrders = orderStore.filter((order) =>
    order.user
      ? Boolean(findStoredUserBySession([order.user], sessionUser))
      : false
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
      const storedUser = findStoredUserBySession(
        db.users as StoredUser[],
        sessionUser
      )

      if (!storedUser) throw new Error("Konto nie istnieje.")
      if (storedUser.isBlocked) throw new Error("Konto jest zablokowane.")
      if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
        throw new Error("Konto B2B oczekuje na zatwierdzenie.")
      }

      const isHardOrder = parsed.data.orderType === "ORDER"
      const resolved = resolveCartItems(
        parsed.data.items,
        db.products as Parameters<typeof resolveCartItems>[1],
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
      const orderStore = db.orders as StoredOrder[]
      const index = orderStore.findIndex((order) => order.id === parsed.data.id)

      if (index === -1) throw new Error("ORDER_NOT_FOUND")

      const currentOrder = orderStore[index]
      const statusTransition = validateStripeOrderStatusTransition(
        currentOrder.stripeCheckoutSessionId,
        currentOrder.paymentStatus,
        currentOrder.status,
        parsed.data.status
      )
      if (statusTransition !== "ok") {
        throw new Error(`ORDER_STATUS_${statusTransition.toUpperCase().replaceAll("-", "_")}`)
      }

      if (
        !canReplaceOrderItems(
          currentOrder.stripeCheckoutSessionId,
          parsed.data.items,
          currentOrder.items
        )
      ) {
        throw new Error("STRIPE_ORDER_ITEMS_IMMUTABLE")
      }

      const items = parsed.data.items ?? currentOrder.items ?? []
      const totalPriceFinal =
        Math.round(
          (items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          ) +
            Number.EPSILON) *
            100
        ) / 100

      const nextOrder: StoredOrder = {
        ...currentOrder,
        status: parsed.data.status,
        estimatedDeliveryDays: resolveEstimatedDeliveryDays(
          parsed.data.estimatedDeliveryDays,
          currentOrder.estimatedDeliveryDays
        ),
        items,
        totalPriceFinal,
        updatedAt: new Date().toISOString(),
      }

      orderStore[index] = nextOrder
      return nextOrder
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Nie znaleziono zamówienia." }, { status: 404 })
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_STATUS_PAYMENT_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Zamówienie Stripe musi być opłacone przed potwierdzeniem lub wysyłką.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_STATUS_STRIPE_CANCEL_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Zamówienia Stripe nie można anulować samą zmianą statusu. Wymagany jest workflow anulowania/refundu Stripe.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_STATUS_INVALID_STRIPE_STATUS"
    ) {
      return NextResponse.json(
        { error: "Zamówienia Stripe nie można zmienić na zapytanie." },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_STATUS_INVALID_TRANSITION"
    ) {
      return NextResponse.json(
        {
          error:
            "Nieprawidłowe przejście statusu zamówienia Stripe. Wymagana kolejność to oczekiwanie → potwierdzone → wysłane.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "STRIPE_ORDER_ITEMS_IMMUTABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "Pozycje zamówienia powiązanego z płatnością Stripe nie mogą być zmieniane.",
        },
        { status: 409 }
      )
    }

    const message = error instanceof Error ? error.message : "Błąd serwera."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
