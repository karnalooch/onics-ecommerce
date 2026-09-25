import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { moneyToMinorUnits } from "@/lib/payments"
import { initializeMockData, saveMockData } from "@/store/serverStore"

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

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([])
  if (!authCheck.authorized) return authCheck.response

  if (!process.env.STRIPE_SECRET_KEY) {
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
    const { users, products, orders } = initializeMockData()
    const storedUser = (users as StoredUser[]).find(
      (user) =>
        (sessionUser.id && user.id === sessionUser.id) ||
        (sessionUser.email &&
          user.email?.toLowerCase() === sessionUser.email.toLowerCase())
    )

    if (!storedUser || storedUser.isBlocked) {
      return NextResponse.json({ error: "Konto jest niedostępne." }, { status: 403 })
    }

    if (storedUser.roleType === "BIZ" && !storedUser.isApproved) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const resolved = resolveCartItems(
      parsed.data.items,
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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
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

    const newOrder = {
      id: orderId,
      orderType: "ORDER",
      createdAt: new Date().toISOString(),
      status: "PENDING_VERIFICATION",
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
      paymentProvider: "STRIPE",
      paymentStatus: "PENDING",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: null,
      paidAt: null,
    }

    orders.unshift(newOrder)

    if (!saveMockData()) {
      try {
        await stripe.checkout.sessions.expire(session.id)
      } catch (expireError) {
        console.error("Nie udało się wygasić osieroconej sesji Stripe:", expireError)
      }
      throw new Error("Nie udało się utrwalić zamówienia przed płatnością.")
    }

    return NextResponse.json({
      id: session.id,
      url: session.url,
      orderId,
    })
  } catch (error) {
    console.error("Błąd generowania bramki checkout:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
