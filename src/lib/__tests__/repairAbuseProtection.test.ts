import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function readRepairRoute() {
  return fs.readFileSync(
    path.join(process.cwd(), "src/app/api/repairs/route.ts"),
    "utf8"
  )
}

describe("repair submission abuse protection", () => {
  it("rate-limits the authenticated account before reading request body", () => {
    const source = readRepairRoute()
    const postStart = source.indexOf("export async function POST")
    const post = source.slice(postStart)
    const authIndex = post.indexOf(
      "authorizeAPI([...COMMERCE_TRANSACTION_ROLES])"
    )
    const limiterIndex = post.indexOf('"repair-submit-account"')
    const bodyIndex = post.indexOf("readRepairJson(req)")

    expect(postStart).toBeGreaterThanOrEqual(0)
    expect(post).toContain("COMMERCE_TRANSACTION_ROLES")
    expect(authIndex).toBeGreaterThanOrEqual(0)
    expect(limiterIndex).toBeGreaterThan(authIndex)
    expect(bodyIndex).toBeGreaterThan(limiterIndex)
    expect(post).toContain("REPAIR_SUBMISSION_RATE_LIMIT")
    expect(source).toContain('"Retry-After": String(result.retryAfterSeconds)')
    expect(source).toContain("status: 429")
    expect(post).toContain("RepairBodyTooLargeError")
    expect(post).toContain("RepairBodyInvalidError")
  })
})
