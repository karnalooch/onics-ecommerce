import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { COMMERCE_TRANSACTION_ROLES } from "@/lib/commerceAccess"
import { buildAuthoritativeCartSnapshot } from "@/lib/cartSnapshot"
import { CART_ITEM_QUANTITY_MAX } from "@/lib/cartQuantity"
import type { CommerceProduct, CommerceUser } from "@/lib/commerce"
import { initializeMockData } from "@/store/serverStore"
import {
  BoundedJsonBodyInvalidError,
  BoundedJsonBodyTooLargeError,
  readBoundedJson,
} from "@/lib/boundedJsonIngress"


const COMMERCE_JSON_MAX_BODY_BYTES = 128 * 1024

const CartPreviewSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        quantity: z.coerce.number().int().min(1).max(CART_ITEM_QUANTITY_MAX),
      })
    )
    .min(1)
    .max(250),
})

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  let requestBody: unknown
  try {
    requestBody = await readBoundedJson(req, COMMERCE_JSON_MAX_BODY_BYTES)
  } catch (error) {
    if (error instanceof BoundedJsonBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie podglądu koszyka jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof BoundedJsonBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane podglądu koszyka." },
        { status: 400 }
      )
    }
    throw error
  }

  const parsed = CartPreviewSchema.safeParse(requestBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "Nieprawidłowe pozycje koszyka.",
      },
      { status: 400 }
    )
  }

  try {
    const snapshot = initializeMockData()
    const currentUser = authCheck.currentUser

    const commerceUser: CommerceUser = {
      id: currentUser.id ? String(currentUser.id) : undefined,
      email: currentUser.email ?? null,
      role: authCheck.currentRole,
      isApproved: currentUser.isApproved,
      isBlocked: currentUser.isBlocked,
      discount: currentUser.discount,
      nip: currentUser.nip,
    }

    const cart = buildAuthoritativeCartSnapshot(
      parsed.data.items,
      snapshot.products as CommerceProduct[],
      commerceUser
    )

    return NextResponse.json(cart, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się odświeżyć koszyka."

    const conflict =
      /Nieprawidłowa ilość|nie istnieje w aktualnym katalogu/.test(message)

    return NextResponse.json(
      {
        error: conflict
          ? "Koszyk zawiera produkt, którego nie ma już w aktualnym katalogu. Usuń nieaktualną pozycję i spróbuj ponownie."
          : "Nie udało się odświeżyć bieżących cen koszyka.",
      },
      { status: conflict ? 409 : 500 }
    )
  }
}
