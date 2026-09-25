import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { initializeMockData } from "@/store/serverStore"

export type UserRole = "ADMIN" | "BIZ" | "RETAIL"

type SessionUser = {
  id?: string
  email?: string | null
}

type StoredUser = {
  id?: string
  email?: string
  roleType?: string
  isBlocked?: boolean
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

/**
 * Weryfikuje sesję względem aktualnego serwerowego źródła prawdy.
 * Rola i blokada konta są odczytywane z bieżącego rekordu użytkownika,
 * a nie wyłącznie z JWT utworzonego podczas logowania.
 */
export async function authorizeAPI(requiredRoles: UserRole[] = []) {
  const session = await auth()

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Nieautoryzowany dostęp (brak sesji)" },
        { status: 401 }
      ),
    }
  }

  const sessionUser = session.user as SessionUser
  const { users } = initializeMockData()
  const storedUser = (users as StoredUser[]).find(
    (user) =>
      (sessionUser.id && user.id === sessionUser.id) ||
      (sessionUser.email &&
        normalizeEmail(user.email) === normalizeEmail(sessionUser.email))
  )

  if (!storedUser) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Konto nie istnieje lub zostało usunięte." },
        { status: 403 }
      ),
    }
  }

  if (storedUser.isBlocked) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Konto jest zablokowane." },
        { status: 403 }
      ),
    }
  }

  const currentRole = storedUser.roleType as UserRole | undefined

  if (!currentRole || (requiredRoles.length > 0 && !requiredRoles.includes(currentRole))) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: `Brak uprawnień. Wymagana rola: ${requiredRoles.join(" lub ")}` },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true as const,
    session,
    user: session.user,
    currentUser: storedUser,
    currentRole,
  }
}
