import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getAccountAccessDecision } from "@/lib/accountAccess"
import { initializeMockData } from "@/store/serverStore"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

export type UserRole = "ADMIN" | "BIZ" | "RETAIL"

type SessionUser = {
  id?: string
  email?: string | null
}

type StoredUser = {
  id?: string
  email?: string
  companyName?: string
  username?: string
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
  nip?: string | null
  discount?: number
  tierName?: string
}

function isUserRole(value: unknown): value is UserRole {
  return value === "ADMIN" || value === "BIZ" || value === "RETAIL"
}

/**
 * Weryfikuje sesję względem aktualnego serwerowego źródła prawdy.
 * Rola, blokada i akceptacja konta są odczytywane z bieżącego rekordu
 * użytkownika, a nie wyłącznie z JWT utworzonego podczas logowania.
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
  const storedUser = findStoredUserBySession(
    users as StoredUser[],
    sessionUser
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

  const accountAccess = getAccountAccessDecision(storedUser)

  if (accountAccess === "blocked") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Konto jest zablokowane." },
        { status: 403 }
      ),
    }
  }

  if (accountAccess === "approval-required") {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Konto oczekuje na zatwierdzenie administratora." },
        { status: 403 }
      ),
    }
  }

  const currentRole = isUserRole(storedUser.roleType) ? storedUser.roleType : undefined

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
    user: {
      ...session.user,
      id: storedUser.id ?? sessionUser.id,
      email: storedUser.email ?? sessionUser.email,
      name:
        storedUser.companyName ||
        storedUser.username ||
        session.user.name,
    },
    currentUser: storedUser,
    currentRole,
  }
}
