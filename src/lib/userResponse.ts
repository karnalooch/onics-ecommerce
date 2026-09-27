export function userRevision(value: unknown) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0
}

export function nextUserRevision(value: unknown) {
  return userRevision(value) + 1
}

export function toSafeUserResponse<T extends Record<string, unknown>>(user: T) {
  const safeUser: Record<string, unknown> = { ...user }
  delete safeUser.passwordHash
  return safeUser as Omit<T, "passwordHash">
}
