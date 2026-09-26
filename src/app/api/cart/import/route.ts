import { NextResponse } from "next/server"
import { authorizeAPI } from "@/lib/authUtils"
import {
  ORDER_IMPORT_MAX_BYTES,
  OrderImportError,
  buildOrderImportPreview,
  parseCeltronicsOrderXml,
} from "@/lib/orderImport"
import {
  OrderImportBodyInvalidError,
  OrderImportBodyTooLargeError,
  readOrderImportBody,
} from "@/lib/orderImportIngress"
import type { CommerceProduct, CommerceUser } from "@/lib/commerce"
import { findStoredUserBySession } from "@/lib/sessionIdentity"
import { initializeMockData } from "@/store/serverStore"

type SessionUser = {
  id?: string
  email?: string | null
  name?: string | null
  role?: string
}

type StoredUser = {
  id?: string
  email?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  discount?: number
  nip?: string | null
}

function contentTypeOf(request: Request) {
  return request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()
}

function commerceUserFromStored(user: StoredUser): CommerceUser {
  return {
    id: user.id ? String(user.id) : undefined,
    email: user.email ?? null,
    role: user.roleType,
    isApproved: user.isApproved,
    isBlocked: user.isBlocked,
    discount: user.discount,
    nip: user.nip,
  }
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN", "BIZ"])
  if (!authCheck.authorized) return authCheck.response

  const contentType = contentTypeOf(req)
  if (contentType !== "application/xml" && contentType !== "text/xml") {
    return NextResponse.json(
      {
        error:
          "Import zamówienia wymaga pliku XML wysłanego jako application/xml lub text/xml.",
      },
      { status: 415 }
    )
  }

  try {
    const parsed = parseCeltronicsOrderXml(await readOrderImportBody(req))
    const snapshot = initializeMockData()

    const storedUser = findStoredUserBySession(
      snapshot.users as StoredUser[],
      authCheck.user as SessionUser
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

    if (
      storedUser?.roleType === "BIZ" &&
      storedUser.isApproved === false
    ) {
      return NextResponse.json(
        { error: "Konto B2B oczekuje na zatwierdzenie." },
        { status: 403 }
      )
    }

    const commerceUser =
      storedUser
        ? commerceUserFromStored(storedUser)
        : ({ role: "ADMIN" } satisfies CommerceUser)

    const preview = buildOrderImportPreview(
      parsed,
      snapshot.products as CommerceProduct[],
      commerceUser
    )

    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof OrderImportBodyTooLargeError) {
      return NextResponse.json(
        {
          error: `Plik XML przekracza limit ${ORDER_IMPORT_MAX_BYTES / 1024} KiB.`,
          code: "XML_TOO_LARGE",
        },
        { status: 413 }
      )
    }

    if (error instanceof OrderImportBodyInvalidError) {
      return NextResponse.json(
        {
          error: "Plik XML musi być poprawnym dokumentem UTF-8.",
          code: "XML_INVALID_ENCODING",
        },
        { status: 400 }
      )
    }

    if (error instanceof OrderImportError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status }
      )
    }

    console.error("Order XML import preview error:", error)
    return NextResponse.json(
      { error: "Nie udało się bezpiecznie przetworzyć pliku XML." },
      { status: 500 }
    )
  }
}
