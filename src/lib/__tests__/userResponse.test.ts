import { describe, expect, it } from "vitest"
import {
  nextUserRevision,
  toSafeUserResponse,
  userRevision,
} from "@/lib/userResponse"

describe("safe user response", () => {
  it("removes password hashes without mutating the stored record", () => {
    const storedUser = {
      id: "u_1",
      email: "partner@example.com",
      passwordHash: "$2b$12$sensitive",
      discount: 15,
      tierName: "PARTNER",
    }

    const responseUser = toSafeUserResponse(storedUser)

    expect(responseUser).toEqual({
      id: "u_1",
      email: "partner@example.com",
      discount: 15,
      tierName: "PARTNER",
    })
    expect("passwordHash" in responseUser).toBe(false)
    expect(storedUser.passwordHash).toBe("$2b$12$sensitive")
  })
})


describe("user revisions", () => {
  it("normalizes legacy revisions and increments monotonically", () => {
    expect(userRevision(undefined)).toBe(0)
    expect(userRevision(null)).toBe(0)
    expect(userRevision(-1)).toBe(0)
    expect(userRevision(1.5)).toBe(0)
    expect(userRevision(4)).toBe(4)

    expect(nextUserRevision(undefined)).toBe(1)
    expect(nextUserRevision(7)).toBe(8)
  })
})
