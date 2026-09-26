import { describe, expect, it } from "vitest"
import {
  FixedWindowRateLimiter,
  getClientRateLimitKey,
} from "@/lib/rateLimit"

describe("fixed-window rate limiter", () => {
  it("blocks after the configured limit until the window resets", () => {
    const limiter = new FixedWindowRateLimiter()
    const policy = { limit: 2, windowMs: 60_000 }

    expect(limiter.check("login", "client-a", policy, 1_000).allowed).toBe(true)
    expect(limiter.check("login", "client-a", policy, 2_000).allowed).toBe(true)

    const blocked = limiter.check("login", "client-a", policy, 3_000)
    expect(blocked).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 58,
    })

    expect(limiter.check("login", "client-a", policy, 61_000).allowed).toBe(true)
  })

  it("keeps namespaces isolated", () => {
    const limiter = new FixedWindowRateLimiter()
    const policy = { limit: 1, windowMs: 60_000 }

    expect(limiter.check("login", "same-key", policy, 0).allowed).toBe(true)
    expect(limiter.check("register", "same-key", policy, 0).allowed).toBe(true)
    expect(limiter.check("login", "same-key", policy, 1_000).allowed).toBe(false)
  })
})

describe("client rate-limit identity", () => {
  it("prefers trusted proxy headers and the first forwarded address", () => {
    const cloudflareRequest = new Request("https://example.test", {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        "x-real-ip": "203.0.113.11",
        "x-forwarded-for": "203.0.113.12, 10.0.0.1",
      },
    })
    expect(getClientRateLimitKey(cloudflareRequest)).toBe("203.0.113.10")

    const forwardedRequest = new Request("https://example.test", {
      headers: {
        "x-forwarded-for": "198.51.100.4, 10.0.0.2",
      },
    })
    expect(getClientRateLimitKey(forwardedRequest)).toBe("198.51.100.4")
  })

  it("fails closed to a shared key when proxy identity is unavailable", () => {
    expect(
      getClientRateLimitKey(new Request("https://example.test"))
    ).toBe("unknown")
  })
})
