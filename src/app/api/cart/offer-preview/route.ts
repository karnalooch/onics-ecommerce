import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  buildCartOfferPreview,
  createCartOfferReference,
  type CartOfferCustomer,
} from "@/lib/cartOffer"
import type { CommerceProduct } from "@/lib/commerce"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { initializeMockData } from "@/store/serverStore"

const OfferItemSchema = z.object({
  id: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(10000),
})

const OfferPreviewSchema = z.object({
  items: z.array(OfferItemSchema).min(1).max(250),
})

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
}

type StoredUser = CartOfferCustomer & {
  id?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  try {
    const parsed = OfferPreviewSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ||
            "Nieprawidłowe pozycje oferty.",
        },
        { status: 400 }
      )
    }

    const snapshot = initializeMockData()
    const sessionUser = authCheck.user as SessionUser
    const storedUser = findStoredUserBySession(
      snapshot.users as StoredUser[],
      sessionUser
    ) as StoredUser | undefined

    if (!storedUser && authCheck.currentRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Nie udało się potwierdzić konta B2B." },
        { status: 401 }
      )
    }

    if (storedUser?.isBlocked) {
      return NextResponse.json(
        { error: "Konto jest zablokowane." },
        { status: 403 }
      )
    }

    if (storedUser?.roleType === "BIZ" && storedUser.isApproved === false) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const now = new Date()
    const customer: CartOfferCustomer = storedUser
      ? {
          id: storedUser.id,
          email: storedUser.email,
          role: storedUser.roleType,
          isApproved: storedUser.isApproved,
          isBlocked: storedUser.isBlocked,
          discount: storedUser.discount,
          nip: storedUser.nip,
          companyName: storedUser.companyName,
        }
      : {
          email: sessionUser.email ?? null,
          role: "ADMIN",
          companyName: null,
          nip: null,
        }

    const preview = buildCartOfferPreview(
      parsed.data.items,
      snapshot.products as CommerceProduct[],
      customer,
      {
        reference: createCartOfferReference(now, crypto.randomUUID()),
        issuedAt: now.toISOString(),
      }
    )

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się przygotować oferty."

    const status =
      /Nieprawidłowa ilość|nie istnieje w aktualnym katalogu|nie ma aktywnej ceny/.test(
        message
      )
        ? 409
        : 500

    return NextResponse.json(
      {
        error:
          status === 409
            ? "Koszyk zmienił się względem aktualnego katalogu. Odśwież go i spróbuj ponownie."
            : "Nie udało się przygotować oferty.",
      },
      { status }
    )
  }
}
