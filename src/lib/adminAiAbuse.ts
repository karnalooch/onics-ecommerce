import {
  applicationRateLimiter,
  type RateLimitPolicy,
  type RateLimitResult,
} from "@/lib/rateLimit"

export const ADMIN_AI_DESCRIPTION_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
} as const satisfies RateLimitPolicy

export const ADMIN_AI_KEY_VALIDATION_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
} as const satisfies RateLimitPolicy

export const ADMIN_KNOWLEDGE_TRAIN_RATE_LIMIT = {
  limit: 12,
  windowMs: 60 * 60 * 1000,
} as const satisfies RateLimitPolicy

type AdminRateLimitActor = {
  id?: unknown
  email?: unknown
}

function actorKey(actor: AdminRateLimitActor) {
  const id =
    typeof actor.id === "string" || typeof actor.id === "number"
      ? String(actor.id)
      : ""
  const email =
    typeof actor.email === "string" ? actor.email.trim().toLowerCase() : ""

  return id || email || "unknown"
}

export function checkAdminAiRateLimit(
  namespace: string,
  actor: AdminRateLimitActor,
  policy: RateLimitPolicy
) {
  return applicationRateLimiter.check(
    `admin-ai:${namespace}`,
    actorKey(actor),
    policy
  )
}

export function adminAiRateLimited(
  result: RateLimitResult,
  message: string
) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  )
}
