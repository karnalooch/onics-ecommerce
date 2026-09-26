import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import {
  canReplacePaymentOrderItems,
  resolveEstimatedDeliveryDays,
  validateBankTransferOrderStatusTransition,
  validateReservedOrderStatusTransition,
  validateStripeOrderStatusTransition,
} from "@/lib/orders"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import {
  applyOrderInventoryTransition,
  reserveInventory,
  type InventoryProduct,
  type InventoryReservationOrder,
} from "@/lib/inventoryReservations"
import { listAvailablePaymentAdminActions } from "@/lib/paymentAdminActions"
import { describeOrderPaymentLifecycle } from "@/lib/paymentProviders"

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

type StoredOrder = InventoryReservationOrder & {
  id?: string
  status?: string
  estimatedDeliveryDays?: number | null
  items?: Array<z.infer<typeof AdminOrderItemSchema>>
  stripeCheckoutSessionId?: string | null
  paymentProvider?: string | null
  paymentStatus?: string | null
  refundStatus?: string | null
  user?: {
    id?: string
    email?: string
    companyName?: string
    nip?: string | null
  }
  [key: string]: unknown
}

function withPaymentLifecycle(
  order: StoredOrder,
  includeAdminActions = false
) {
  const described = {
    ...order,
    paymentLifecycle: describeOrderPaymentLifecycle(order),
  }

  return includeAdminActions
    ? {
        ...described,
        paymentAdminActions: listAvailablePaymentAdminActions(order),
      }
    : described
}

export async function GET() {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const sessionUser = authCheck.user as SessionUser
  const { orders } = initializeMockData()
  const orderStore = orders as StoredOrder[]

  if (authCheck.currentRole === "ADMIN") {
    return NextResponse.json(
      orderStore.map((order) => withPaymentLifecycle(order, true))
    )
  }

  const ownOrders = orderStore.filter((order) =>
    order.user
      ? Boolean(findStoredUserBySession([order.user], sessionUser))
      : false
  )

  return NextResponse.json(ownOrders.map(withPaymentLifecycle))
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

      const reservedAt = isHardOrder
        ? new Date().toISOString()
        : null

      if (isHardOrder) {
        reserveInventory(
          db.products as InventoryProduct[],
          resolved.items
        )
      }

      const order = {
        id: `ORD-${crypto.randomUUID()}`,
        orderType: parsed.data.orderType,
        createdAt: new Date().toISOString(),
        status: isHardOrder ? "PENDING_VERIFICATION" : "INQUIRY",
        estimatedDeliveryDays: null,
        totalPriceOrig: resolved.total,
        totalPriceFinal: resolved.total,
        items: resolved.items,
        ...(isHardOrder
          ? {
              inventoryReservationSource: "ORDER",
              inventoryReservationStatus: "RESERVED",
              inventoryReservedAt: reservedAt,
              inventoryReleasedAt: null,
              inventoryFinalizedAt: null,
              inventoryReReservedAt: null,
            }
          : {}),
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

    return NextResponse.json(
      withPaymentLifecycle(newOrder as StoredOrder),
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd serwera."
    const inventoryConflict =
      message === "INVENTORY_NOT_AVAILABLE" ||
      message === "INVENTORY_PRODUCT_NOT_FOUND"
    const publicMessage = inventoryConflict
      ? "Stan magazynowy zmienił się podczas składania zamówienia. Odśwież koszyk i spróbuj ponownie."
      : message
    const status =
      message === "Konto nie istnieje."
        ? 401
        : /zablokowane|oczekuje na zatwierdzenie/.test(message)
          ? 403
          : inventoryConflict ||
              /Nieprawidłowa ilość|nie istnieje w aktualnym katalogu|nie ma aktywnej ceny|Brak wymaganej ilości/.test(message)
            ? 409
            : 500

    return NextResponse.json({ error: publicMessage }, { status })
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
        parsed.data.status,
        currentOrder.refundStatus
      )
      if (statusTransition !== "ok") {
        throw new Error(`ORDER_STATUS_${statusTransition.toUpperCase().replaceAll("-", "_")}`)
      }

      const bankTransferTransition =
        validateBankTransferOrderStatusTransition(
          currentOrder.paymentProvider,
          currentOrder.paymentStatus,
          currentOrder.status,
          parsed.data.status
        )
      if (bankTransferTransition !== "ok") {
        throw new Error(
          `ORDER_BANK_TRANSFER_${bankTransferTransition
            .toUpperCase()
            .replaceAll("-", "_")}`
        )
      }

      const reservedStatusTransition =
        validateReservedOrderStatusTransition(
          currentOrder.inventoryReservationSource,
          currentOrder.status,
          parsed.data.status
        )
      if (reservedStatusTransition !== "ok") {
        throw new Error("ORDER_RESERVATION_INVALID_TRANSITION")
      }

      if (
        !canReplacePaymentOrderItems(
          currentOrder.paymentProvider,
          currentOrder.stripeCheckoutSessionId,
          parsed.data.items,
          currentOrder.items
        )
      ) {
        throw new Error("PAYMENT_ORDER_ITEMS_IMMUTABLE")
      }

      const items = parsed.data.items ?? currentOrder.items ?? []

      applyOrderInventoryTransition(
        db.products as InventoryProduct[],
        currentOrder,
        items,
        parsed.data.status
      )

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

    return NextResponse.json(withPaymentLifecycle(updatedOrder, true))
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
      error.message === "ORDER_BANK_TRANSFER_PAYMENT_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Przelew bankowy musi zostać zaksięgowany przez administratora przed przekazaniem zamówienia do logistyki.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_BANK_TRANSFER_MANUAL_REFUND_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Opłaconego przelewu nie można anulować samą zmianą statusu. Najpierw wykonaj zwrot środków, a następnie potwierdź go w dedykowanej akcji płatniczej.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_BANK_TRANSFER_INVALID_BANK_TRANSFER_STATUS"
    ) {
      return NextResponse.json(
        {
          error:
            "Zamówienia z przelewem bankowym nie można zmienić na zapytanie.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "ORDER_STATUS_REFUND_IN_PROGRESS"
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można przekazać zamówienia do logistyki, dopóki refund Stripe jest w toku.",
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
      error.message === "ORDER_RESERVATION_INVALID_TRANSITION"
    ) {
      return NextResponse.json(
        {
          error:
            "Nieprawidłowe przejście statusu rezerwacji B2B. Wymagana kolejność to oczekiwanie → potwierdzone → wysłane, z możliwością anulowania przed wysyłką.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      [
        "INVENTORY_FINALIZED_ITEMS_IMMUTABLE",
        "INVENTORY_RELEASED_ITEMS_IMMUTABLE",
        "INVENTORY_CANCEL_ITEMS_IMMUTABLE",
      ].includes(error.message)
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można zmienić ilości produktów po zwolnieniu lub finalizacji rezerwacji magazynowej.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      ["INVENTORY_NOT_AVAILABLE", "INVENTORY_PRODUCT_NOT_FOUND"].includes(
        error.message
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Nie można zaktualizować rezerwacji: wymagany stan magazynowy nie jest już dostępny.",
        },
        { status: 409 }
      )
    }

    if (
      error instanceof Error &&
      error.message === "PAYMENT_ORDER_ITEMS_IMMUTABLE"
    ) {
      return NextResponse.json(
        {
          error:
            "Pozycje i kwoty zamówienia powiązanego z checkoutem płatniczym nie mogą być zmieniane po jego utworzeniu.",
        },
        { status: 409 }
      )
    }

    const message = error instanceof Error ? error.message : "Błąd serwera."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
