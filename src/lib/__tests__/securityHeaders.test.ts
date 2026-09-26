import { describe, expect, it } from "vitest"
import { getSecurityHeaders } from "@/lib/securityHeaders"

function asMap(nodeEnv: string) {
  return new Map(
    getSecurityHeaders(nodeEnv).map((header) => [header.key, header.value])
  )
}

describe("HTTP security headers", () => {
  it("applies browser hardening headers", () => {
    const headers = asMap("development")

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(headers.get("X-Frame-Options")).toBe("DENY")
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    )
    expect(headers.get("Permissions-Policy")).toContain("camera=()")
  })

  it("enables HSTS only in production", () => {
    expect(asMap("production").get("Strict-Transport-Security")).toBe(
      "max-age=31536000"
    )
    expect(asMap("development").has("Strict-Transport-Security")).toBe(false)
  })
})
