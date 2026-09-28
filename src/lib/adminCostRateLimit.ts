import {
  applicationRateLimiter,
  type RateLimitPolicy,
} from "@/lib/rateLimit"

export type AdminCostOperation =
  | "product-ai-description"
  | "knowledge-training"
  | "knowledge-validate-key"

type AccountIdentity = {
  id?: string | null
  email?: string | null
}

export const ADMIN_COST_RATE_LIMIT_POLICIES = {
  "product-ai-description": { limit: 30, windowMs: 10 * 60_000 },
  "knowledge-training": { limit: 4, windowMs: 60 * 60_000 },
  "knowledge-validate-key": { limit: 20, windowMs: 10 * 60_000 },
} as const satisfies Record<AdminCostOperation, RateLimitPolicy>

export function adminCostRateLimitKey(actor: AccountIdentity) {
  const id = String(actor.id ?? "").trim()
  if (id) return `id:${id.slice(0, 128)}`

  const email = String(actor.email ?? "").trim().toLowerCase()
  if (email) return `email:${email.slice(0, 256)}`

  return "account:unknown"
}

export function checkAdminCostLimit(
  operation: AdminCostOperation,
  actor: AccountIdentity
) {
  return applicationRateLimiter.check(
    `admin-cost:${operation}`,
    adminCostRateLimitKey(actor),
    ADMIN_COST_RATE_LIMIT_POLICIES[operation]
  )
}
