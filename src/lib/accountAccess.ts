export type AccountAccessRecord = {
  roleType?: string
  isApproved?: boolean
  isBlocked?: boolean
}

export type AccountAccessDecision =
  | "allowed"
  | "blocked"
  | "approval-required"

export function getAccountAccessDecision(
  user: AccountAccessRecord
): AccountAccessDecision {
  if (user.isBlocked) return "blocked"

  if (user.roleType === "BIZ" && user.isApproved !== true) {
    return "approval-required"
  }

  return "allowed"
}
