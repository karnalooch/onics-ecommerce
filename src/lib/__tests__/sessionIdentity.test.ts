import { describe, expect, it } from "vitest"
import { findStoredUserBySession } from "@/lib/sessionIdentity"

describe("session identity binding", () => {
  const users = [
    { id: "u_new", email: "old@example.com", roleType: "BIZ" },
    { id: "u_original", email: "new@example.com", roleType: "ADMIN" },
  ]

  it("treats a present session id as authoritative", () => {
    expect(
      findStoredUserBySession(users, {
        id: "u_original",
        email: "old@example.com",
      })
    ).toEqual(users[1])
  })

  it("does not fall back to email when a session id no longer exists", () => {
    expect(
      findStoredUserBySession(users, {
        id: "u_deleted",
        email: "old@example.com",
      })
    ).toBeUndefined()
  })

  it("supports normalized email fallback for legacy sessions without an id", () => {
    expect(
      findStoredUserBySession(users, {
        email: "  OLD@EXAMPLE.COM ",
      })
    ).toEqual(users[0])
  })

  it("rejects sessions without a usable id or email", () => {
    expect(findStoredUserBySession(users, {})).toBeUndefined()
  })
})
