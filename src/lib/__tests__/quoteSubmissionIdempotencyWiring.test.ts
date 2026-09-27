import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("quote submission idempotency wiring", () => {
  it("requires a UUID and checks replay before creating a quote", () => {
    const route = read("src/app/api/quotes/route.ts")

    expect(route).toContain("requestId: z.string().uuid()")
    expect(route).toContain(
      "quote.clientQuoteRequestId === parsed.data.requestId"
    )
    expect(route).toContain(
      "existing.clientQuoteRequestFingerprint !== requestFingerprint"
    )
    expect(route).toContain("clientQuoteRequestId: parsed.data.requestId")
    expect(route).toContain(
      "clientQuoteRequestFingerprint: requestFingerprint"
    )
    expect(
      route.indexOf(
        "quote.clientQuoteRequestId === parsed.data.requestId"
      )
    ).toBeLessThan(route.indexOf("orders.unshift(quote)"))
  })

  it("does not repeat the SMTP side effect for an idempotent replay", () => {
    const route = read("src/app/api/quotes/route.ts")
    expect(route).toContain(
      "if (!result.replayed && smtpHost && smtpUser && smtpPass && adminEmail)"
    )
    expect(route).toContain('"Idempotency-Replayed": "true"')
  })

  it("keeps the browser request id across uncertain retries and validates the response", () => {
    const modal = read("src/components/ui/QuoteRequestModal.tsx")

    expect(modal).toContain(
      "submissionRef.current?.signature !== submissionSignature"
    )
    expect(modal).toContain("requestId: crypto.randomUUID()")
    expect(modal).toContain("requestId: currentRequestId")
    expect(modal).toContain(
      "payload?.clientRequestId !== currentRequestId"
    )
    expect(modal.indexOf("payload?.clientRequestId"))
      .toBeLessThan(modal.indexOf("setSuccess(true)"))
  })
})
