import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  BCRYPT_MAX_PASSWORD_BYTES,
  isPasswordWithinBcryptLimit,
  passwordUtf8ByteLength,
} from "../passwordPolicy"

describe("bcrypt password byte boundary", () => {
  it("accepts exactly 72 UTF-8 bytes and rejects 73 ASCII bytes", () => {
    expect(passwordUtf8ByteLength("a".repeat(72))).toBe(BCRYPT_MAX_PASSWORD_BYTES)
    expect(isPasswordWithinBcryptLimit("a".repeat(72))).toBe(true)
    expect(isPasswordWithinBcryptLimit("a".repeat(73))).toBe(false)
  })

  it("measures UTF-8 bytes rather than JavaScript characters", () => {
    expect(passwordUtf8ByteLength("🙂".repeat(18))).toBe(72)
    expect(isPasswordWithinBcryptLimit("🙂".repeat(18))).toBe(true)
    expect(passwordUtf8ByteLength("🙂".repeat(19))).toBe(76)
    expect(isPasswordWithinBcryptLimit("🙂".repeat(19))).toBe(false)
  })

  it("wires registration and login to the shared byte boundary", () => {
    const authSource = fs.readFileSync(
      path.join(process.cwd(), "src/auth.ts"),
      "utf8"
    )
    const registerSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/register/route.ts"),
      "utf8"
    )

    expect(registerSource).toContain(
      '.refine(isPasswordWithinBcryptLimit, "Hasło jest zbyt długie")'
    )
    expect(registerSource).not.toContain(
      '.max(72, "Hasło jest zbyt długie")'
    )

    const accountLimitIndex = authSource.indexOf(
      'applicationRateLimiter.check(\n          "login:account"'
    )
    const passwordLimitIndex = authSource.indexOf(
      "if (!isPasswordWithinBcryptLimit(password)) return null"
    )
    const accountLookupIndex = authSource.indexOf(
      'const { initializeMockData } = await import("@/store/serverStore")'
    )

    expect(accountLimitIndex).toBeGreaterThanOrEqual(0)
    expect(passwordLimitIndex).toBeGreaterThan(accountLimitIndex)
    expect(accountLookupIndex).toBeGreaterThan(passwordLimitIndex)
  })
})
