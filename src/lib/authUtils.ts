import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type UserRole = "ADMIN" | "BIZ" | "RETAIL";

/**
 * Weryfikuje sesję i uprawnienia użytkownika.
 * @param requiredRoles Lista dozwolonych ról (jeśli pusta, dopuszcza każdego zalogowanego)
 * @returns Zwraca sesję jeśli OK, lub NextResponse w przypadku błędu
 */
export async function authorizeAPI(requiredRoles: UserRole[] = []) {
  const session = await auth();

  if (!session || !session.user) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: "Nieautoryzowany dostęp (brak sesji)" }, { status: 401 }) 
    };
  }

  const userRole = (session.user as any).role as UserRole;

  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return { 
      authorized: false, 
      response: NextResponse.json({ error: `Brak uprawnień. Wymagana rola: ${requiredRoles.join(" lub ")}` }, { status: 403 }) 
    };
  }

  return { authorized: true, session, user: session.user as any };
}
