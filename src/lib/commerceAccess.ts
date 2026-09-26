export const COMMERCE_TRANSACTION_ROLES = ["ADMIN", "BIZ"] as const

export type CommerceTransactionRole =
  (typeof COMMERCE_TRANSACTION_ROLES)[number]

export function isCommerceTransactionRole(
  value: unknown
): value is CommerceTransactionRole {
  return (
    value === "ADMIN" ||
    value === "BIZ"
  )
}
