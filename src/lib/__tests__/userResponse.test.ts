import { describe, expect, it } from "vitest"
import { toSafeUserResponse } from "@/lib/userResponse"

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
