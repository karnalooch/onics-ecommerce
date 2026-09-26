export type SessionIdentity = {
  id?: string | null
  email?: string | null
}

export type StoredIdentity = {
  id?: string | null
  email?: string | null
}

function normalizeIdentityEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

/**
 * Bind a session to the same stored account that originally issued it.
 *
 * Modern sessions carry a stable user id. When that id is present it is
 * authoritative: never fall back to email, because an old email address can
 * later belong to a different account.
 *
 * Email fallback exists only for legacy sessions that genuinely have no id.
 */
export function findStoredUserBySession<T extends StoredIdentity>(
  users: T[],
  sessionUser: SessionIdentity
): T | undefined {
  const sessionId = String(sessionUser.id ?? "").trim()

  if (sessionId) {
    return users.find((user) => String(user.id ?? "").trim() === sessionId)
  }

  const sessionEmail = normalizeIdentityEmail(sessionUser.email)
  if (!sessionEmail) return undefined

  return users.find(
    (user) => normalizeIdentityEmail(user.email) === sessionEmail
  )
}
