import { describe, expect, it } from "vitest"
import {
  buildCartOwnerKey,
  shouldResetCartForOwner,
} from "@/lib/cartIdentity"

describe("cart account identity", () => {
  it("uses stable account id before email", () => {
    expect(
      buildCartOwnerKey({
        id: " u-123 ",
        email: "old@example.com",
      })
    ).toBe("id:u-123")
  })

  it("normalizes email only for legacy identities without an id", () => {
    expect(
      buildCartOwnerKey({
        email: "  PARTNER@Example.COM ",
      })
    ).toBe("email:partner@example.com")
    expect(buildCartOwnerKey({})).toBeNull()
  })

  it("resets when the account changes", () => {
    expect(shouldResetCartForOwner("id:a", "id:b", true)).toBe(true)
    expect(shouldResetCartForOwner("id:a", "id:a", true)).toBe(false)
  })

  it("clears orphaned or legacy cart items when no account is active", () => {
    expect(shouldResetCartForOwner(null, null, true)).toBe(true)
    expect(shouldResetCartForOwner(undefined, null, true)).toBe(true)
    expect(shouldResetCartForOwner(null, null, false)).toBe(false)
  })

  it("treats an unowned persisted cart as unsafe when an account binds", () => {
    expect(shouldResetCartForOwner(null, "id:a", true)).toBe(true)
    expect(shouldResetCartForOwner(undefined, "id:a", true)).toBe(true)
  })
})
