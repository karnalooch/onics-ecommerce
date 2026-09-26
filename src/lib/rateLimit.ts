import crypto from "crypto"

export type RateLimitPolicy = Readonly<{
  limit: number
  windowMs: number
}>

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const DEFAULT_MAX_BUCKETS = 10_000

function validatePolicy(policy: RateLimitPolicy) {
  if (!Number.isInteger(policy.limit) || policy.limit < 1) {
    throw new Error("Rate limit must be a positive integer.")
  }
  if (!Number.isInteger(policy.windowMs) || policy.windowMs < 1_000) {
    throw new Error("Rate limit window must be at least 1000 ms.")
  }
}

function bucketId(namespace: string, key: string) {
  return crypto
    .createHash("sha256")
    .update(namespace)
    .update("\0")
    .update(key)
    .digest("hex")
}

function retryAfterSeconds(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1_000))
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>()

  constructor(private readonly maxBuckets = DEFAULT_MAX_BUCKETS) {
    if (!Number.isInteger(maxBuckets) || maxBuckets < 1) {
      throw new Error("maxBuckets must be a positive integer.")
    }
  }

  check(
    namespace: string,
    key: string,
    policy: RateLimitPolicy,
    now = Date.now()
  ): RateLimitResult {
    validatePolicy(policy)
    this.pruneExpired(now)

    const id = bucketId(namespace, key)
    const current = this.buckets.get(id)
    if (!current || current.resetAt <= now) {
      return this.openWindow(id, policy, now)
    }
    if (current.count >= policy.limit) {
      return this.blockedResult(current, now)
    }

    current.count += 1
    return this.allowedResult(current, policy, now)
  }

  private openWindow(
    id: string,
    policy: RateLimitPolicy,
    now: number
  ): RateLimitResult {
    this.ensureCapacity()
    const bucket = { count: 1, resetAt: now + policy.windowMs }
    this.buckets.set(id, bucket)
    return this.allowedResult(bucket, policy, now)
  }

  private allowedResult(
    bucket: RateLimitBucket,
    policy: RateLimitPolicy,
    now: number
  ): RateLimitResult {
    return {
      allowed: true,
      remaining: Math.max(0, policy.limit - bucket.count),
      retryAfterSeconds: retryAfterSeconds(bucket.resetAt, now),
    }
  }

  private blockedResult(
    bucket: RateLimitBucket,
    now: number
  ): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfterSeconds(bucket.resetAt, now),
    }
  }

  private pruneExpired(now: number) {
    if (this.buckets.size < this.maxBuckets / 2) return

    for (const [id, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(id)
    }
  }

  private ensureCapacity() {
    while (this.buckets.size >= this.maxBuckets) {
      const oldest = this.buckets.keys().next().value as string | undefined
      if (!oldest) return
      this.buckets.delete(oldest)
    }
  }
}

export function getClientRateLimitKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]
  const candidate =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwarded

  const normalized = candidate?.trim()
  return normalized ? normalized.slice(0, 128) : "unknown"
}

export const applicationRateLimiter = new FixedWindowRateLimiter()
