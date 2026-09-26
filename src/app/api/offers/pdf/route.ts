import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { resolveCartItems } from "@/lib/commerce"
import { createOfferPdf } from "@/lib/offerPdf"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { initializeMockData } from "@/store/serverStore"

const OfferPdfSchema = z.object({
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
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = OfferPdfSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowy koszyk." },
      { status: 400 }
    )
  }

  try {
    const snapshot = initializeMockData()
    const storedUser = findStoredUserBySession(
      snapshot.users as StoredUser[],
      authCheck.user as SessionUser
    )

    if (!storedUser) {
      return NextResponse.json(
        { error: "Konto nie istnieje." },
        { status: 401 }
      )
    }
    if (storedUser.isBlocked) {
      return NextResponse.json(
        { error: "Konto jest zablokowane." },
        { status: 403 }
      )
    }
    if (
      storedUser.roleType === "BIZ" &&
      !storedUser.isApproved
    ) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const resolved = resolveCartItems(
      parsed.data.items,
      snapshot.products as Parameters<typeof resolveCartItems>[1],
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
        requirePriced: true,
        requireStock: false,
      }
    )

    const createdAt = new Date().toISOString()
    const offerId = `OFF-${createdAt.slice(0, 10).replaceAll("-", "")}-${crypto
      .randomUUID()
      .slice(0, 8)
      .toUpperCase()}`

    const bytes = await createOfferPdf({
      offerId,
      createdAt,
      customer: {
        companyName: storedUser.companyName,
        email: storedUser.email,
        nip: storedUser.nip,
      },
      items: resolved.items,
      total: resolved.total,
    })

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="oferta-${offerId}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się wygenerować oferty."

    const conflict =
      /nie istnieje w aktualnym katalogu|nie ma aktywnej ceny|Nieprawidłowa ilość/.test(
        message
      )

    return NextResponse.json(
      {
        error: conflict
          ? "Koszyk zawiera nieaktualne dane. Odśwież produkty i spróbuj ponownie."
          : "Nie udało się wygenerować oferty PDF.",
      },
      { status: conflict ? 409 : 500 }
    )
  }
}
