export type CartAccountIdentity = {
  id?: string | null
  email?: string | null
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

export function buildCartOwnerKey(
  identity?: CartAccountIdentity | null
): string | null {
  const id = String(identity?.id ?? "").trim()
  if (id) return `id:${id}`

  const email = normalizeEmail(identity?.email)
  return email ? `email:${email}` : null
}

export function shouldResetCartForOwner(
  currentOwnerKey: string | null | undefined,
  nextOwnerKey: string | null,
  hasItems: boolean
) {
  if (!nextOwnerKey) {
    return currentOwnerKey != null || hasItems
  }

  return currentOwnerKey !== nextOwnerKey
}
