export function toSafeUserResponse<T extends Record<string, unknown>>(user: T) {
  const safeUser: Record<string, unknown> = { ...user }
  delete safeUser.passwordHash
  return safeUser as Omit<T, "passwordHash">
}
