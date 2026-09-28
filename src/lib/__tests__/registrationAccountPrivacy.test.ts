import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

describe("registration account enumeration hardening", () => {
  it("keeps valid registration responses existence-neutral", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/register/route.ts"),
      "utf8"
    )

    expect(source).not.toContain("EMAIL_EXISTS")
    expect(source).not.toContain("Użytkownik o tym adresie e-mail już istnieje.")
    expect(source).not.toContain("{ status: 409 }")
    expect(source).not.toContain("initializeMockData")

    expect(source).toContain("const passwordHash = await runPasswordWork(() =>")
    expect(source).toContain("bcrypt.hash(data.password, 12)")
    expect(source).toContain("const alreadyExists = users.some(")
    expect(source).toContain("if (!alreadyExists) {")
    expect(source).toContain("users.push(newUser)")
    expect(source).toContain("{ success: true }")
    expect(source).toContain("{ status: 202 }")

    const hashIndex = source.indexOf(
      "const passwordHash = await runPasswordWork(() =>"
    )
    const mutationIndex = source.indexOf("await mutateMockData((db) =>")

    expect(hashIndex).toBeGreaterThanOrEqual(0)
    expect(mutationIndex).toBeGreaterThan(hashIndex)
  })
})
