import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { initializeMockData } from "@/store/serverStore"

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
    const { users, products } = initializeMockData()
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

    const session = await stripe.checkout.sessions.create({
      line_items: resolved.items.map((item) => ({
        price_data: {
          currency: "pln",
          unit_amount: Math.round(item.price * 100),
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
        pl_nip: storedUser.nip || "",
        client_role: storedUser.roleType || "RETAIL",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (error) {
    console.error("Błąd generowania bramki checkout:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Błąd serwera." },
      { status: 500 }
    )
  }
}
