import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { moneyToMinorUnits, resolveStripeCheckoutConfig } from "@/lib/payments"
import { reserveInventory } from "@/lib/inventoryReservations"
import { initializeMockData, mutateMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

const CartSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10000),
      })
    )
    .min(1)
    .max(250),
})

type SessionUser = {
  id?: string
  email?: string | null
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

function assertCheckoutUser(user: StoredUser | undefined) {
  if (!user || user.isBlocked) {
    throw new Error("Konto jest niedostępne.")
  }

  if (user.roleType === "BIZ" && !user.isApproved) {
    throw new Error("Konto B2B oczekuje na zatwierdzenie.")
  }

  return user
}

function resolveCheckout(
  users: StoredUser[],
  products: Parameters<typeof resolveCartItems>[1],
  sessionUser: SessionUser,
  items: z.infer<typeof CartSchema>["items"]
) {
  const storedUser = assertCheckoutUser(
    findStoredUserBySession(users, sessionUser)
  )
  const resolved = resolveCartItems(
    items,
    products,
    {
      id: storedUser.id,
      email: storedUser.email,
      role: storedUser.roleType,
      isApproved: storedUser.isApproved,
      isBlocked: storedUser.isBlocked,
      discount: storedUser.discount,
      nip: storedUser.nip,
    },
    { requirePriced: true, requireStock: true }
  )

  return { storedUser, resolved }
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([])
  if (!authCheck.authorized) return authCheck.response

  let stripeConfig: ReturnType<typeof resolveStripeCheckoutConfig>
  try {
    stripeConfig = resolveStripeCheckoutConfig({
      requestUrl: req.url,
    })
  } catch (error) {
    console.error("Nieprawidłowa konfiguracja Stripe:", error)
    return NextResponse.json(
      { error: "Płatności online nie są skonfigurowane." },
      { status: 503 }
    )
  }

  try {
    const parsed = CartSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Nieprawidłowy koszyk." },
        { status: 400 }
      )
    }

    const sessionUser = authCheck.user as SessionUser
    const snapshot = initializeMockData()
    const { storedUser, resolved } = resolveCheckout(
      snapshot.users as StoredUser[],
      snapshot.products as Parameters<typeof resolveCartItems>[1],
      sessionUser,
      parsed.data.items
    )

    const stripe = new Stripe(stripeConfig.stripeSecretKey)
    const appUrl = stripeConfig.appUrl
    const orderId = `ORD-${crypto.randomUUID()}`

    const session = await stripe.checkout.sessions.create({
      line_items: resolved.items.map((item) => ({
        price_data: {
          currency: "pln",
          unit_amount: moneyToMinorUnits(item.price),
          product_data: {
            name: item.name,
            metadata: {
              sku: item.sku,
              product_id: item.id,
            },
          },
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${appUrl}/oferty/zamowienia?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/koszyk?payment=cancelled`,
      client_reference_id: String(storedUser.id ?? ""),
      customer_email: storedUser.email,
      metadata: {
        order_id: orderId,
        pl_nip: storedUser.nip || "",
        client_role: storedUser.roleType || "RETAIL",
      },
      payment_intent_data: {
        metadata: {
          order_id: orderId,
        },
      },
    })

    if (!session.url) {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireError) {
        console.error("Nie udało się wygasić sesji Stripe bez URL:", expireError)
      }
      throw new Error("Stripe nie zwrócił adresu płatności.")
    }

    try {
      await mutateMockData((db) => {
        const fresh = resolveCheckout(
          db.users as StoredUser[],
          db.products as Parameters<typeof resolveCartItems>[1],
          sessionUser,
          parsed.data.items
        )

        if (JSON.stringify(fresh.resolved) !== JSON.stringify(resolved)) {
          throw new Error("CHECKOUT_STATE_CHANGED")
        }

        reserveInventory(
          db.products as Parameters<typeof reserveInventory>[0],
          fresh.resolved.items
        )
        const reservedAt = new Date().toISOString()

        db.orders.unshift({
          id: orderId,
          orderType: "ORDER",
          createdAt: new Date().toISOString(),
          status: "PENDING_VERIFICATION",
          estimatedDeliveryDays: null,
          totalPriceOrig: fresh.resolved.total,
          totalPriceFinal: fresh.resolved.total,
          items: fresh.resolved.items,
          user: {
            id: fresh.storedUser.id,
            email: fresh.storedUser.email,
            companyName: fresh.storedUser.companyName,
            nip: fresh.storedUser.nip ?? null,
          },
          paymentProvider: "STRIPE",
          paymentStatus: "PENDING",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: null,
          paidAt: null,
          inventoryReservationStatus: "RESERVED",
          inventoryReservedAt: reservedAt,
          inventoryReleasedAt: null,
          inventoryFinalizedAt: null,
          inventoryReReservedAt: null,
        })
      })
    } catch (persistenceError) {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireError) {
        console.error("Nie udało się wygasić osieroconej sesji Stripe:", expireError)
      }
      throw persistenceError
    }

    return NextResponse.json({
      id: session.id,
      url: session.url,
      orderId,
    })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    const inventoryConflict =
      code === "INVENTORY_NOT_AVAILABLE" ||
      code === "INVENTORY_PRODUCT_NOT_FOUND" ||
      /Brak wymaganej ilości produktu/.test(code)
    const message =
      code === "CHECKOUT_STATE_CHANGED"
        ? "Koszyk zmienił się podczas tworzenia płatności. Odśwież ceny i spróbuj ponownie."
        : inventoryConflict
          ? "Stan magazynowy zmienił się podczas tworzenia płatności. Odśwież koszyk i spróbuj ponownie."
          : error instanceof Error
            ? error.message
            : "Błąd serwera."

    console.error("Błąd generowania bramki checkout:", error)
    return NextResponse.json(
      { error: message },
      { status: inventoryConflict ? 409 : 500 }
    )
  }
}
