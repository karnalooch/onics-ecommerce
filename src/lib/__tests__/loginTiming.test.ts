import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import { consumeRejectedLoginPasswordWork } from "../loginTiming"

describe("login timing hardening", () => {
  it("keeps the dummy bcrypt work executable", async () => {
    await expect(
      consumeRejectedLoginPasswordWork("definitely-not-the-dummy-password")
    ).resolves.toBeUndefined()
  })

  it("applies the per-email limiter before account lookup and burns bcrypt work on rejected accounts", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/auth.ts"),
      "utf8"
    )

    const accountLimitIndex = source.indexOf(
      'applicationRateLimiter.check(\n          "login:account"'
    )
    const accountLookupIndex = source.indexOf(
      'const { initializeMockData } = await import("@/store/serverStore")'
    )

    expect(accountLimitIndex).toBeGreaterThanOrEqual(0)
    expect(accountLookupIndex).toBeGreaterThan(accountLimitIndex)

    const rejectedAccountBranch =
      'if (!user || getAccountAccessDecision(user) !== "allowed")'
    const rejectedAccountIndex = source.indexOf(rejectedAccountBranch)
    const rejectedWorkIndex = source.indexOf(
      "await consumeRejectedLoginPasswordWork(password)",
      rejectedAccountIndex
    )

    expect(rejectedAccountIndex).toBeGreaterThanOrEqual(0)
    expect(rejectedWorkIndex).toBeGreaterThan(rejectedAccountIndex)

    const helperCalls = source.match(
      /await consumeRejectedLoginPasswordWork\(password\)/g
    )
    expect(helperCalls?.length).toBeGreaterThanOrEqual(3)
  })
})
