import { describe, expect, it } from "vitest"
import { getAccountAccessDecision } from "@/lib/accountAccess"

describe("account access", () => {
  it("blocks explicitly blocked accounts", () => {
    expect(
      getAccountAccessDecision({
        roleType: "BIZ",
        isApproved: true,
        isBlocked: true,
      })
    ).toBe("blocked")
  })

  it("requires approval for BIZ accounts", () => {
    expect(
      getAccountAccessDecision({
        roleType: "BIZ",
        isApproved: false,
        isBlocked: false,
      })
    ).toBe("approval-required")

    expect(
      getAccountAccessDecision({
        roleType: "BIZ",
        isBlocked: false,
      })
    ).toBe("approval-required")
  })

  it("allows approved BIZ accounts", () => {
    expect(
      getAccountAccessDecision({
        roleType: "BIZ",
        isApproved: true,
        isBlocked: false,
      })
    ).toBe("allowed")
  })

  it("does not require BIZ approval for ADMIN or RETAIL accounts", () => {
    expect(
      getAccountAccessDecision({
        roleType: "ADMIN",
        isApproved: false,
        isBlocked: false,
      })
    ).toBe("allowed")

    expect(
      getAccountAccessDecision({
        roleType: "RETAIL",
        isApproved: false,
        isBlocked: false,
      })
    ).toBe("allowed")
  })
})
