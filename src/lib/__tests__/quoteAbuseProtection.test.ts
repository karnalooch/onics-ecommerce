import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readQuoteRoute() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/api/quotes/route.ts"),
    "utf8"
  )
}

describe("quote submission abuse protection", () => {
  it("rate-limits the authenticated account before reading request body", () => {
    const source = readQuoteRoute()
    const authIndex = source.indexOf('authorizeAPI(["ADMIN", "BIZ"])')
    const limiterIndex = source.indexOf('"quote-submit-account"')
    const bodyIndex = source.indexOf("readQuoteJson(req)")

    expect(authIndex).toBeGreaterThanOrEqual(0)
    expect(limiterIndex).toBeGreaterThan(authIndex)
    expect(bodyIndex).toBeGreaterThan(limiterIndex)
    expect(source).toContain("QUOTE_SUBMISSION_RATE_LIMIT")
    expect(source).toContain('"Retry-After": String(result.retryAfterSeconds)')
    expect(source).toContain("status: 429")
    expect(source).toContain("QuoteBodyTooLargeError")
    expect(source).toContain("QuoteBodyInvalidError")
  })

  it("bounds SMTP connection and socket lifetime", () => {
    const source = readQuoteRoute()

    expect(source).toContain("connectionTimeout: 5_000")
    expect(source).toContain("greetingTimeout: 5_000")
    expect(source).toContain("socketTimeout: 10_000")
  })
})
