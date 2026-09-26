import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function listSourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) return listSourceFiles(absolutePath)
    return /\.(ts|tsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

describe("admin server action authorization contract", () => {
  it("does not allow JWT-only admin checks in server-action source files", () => {
    const adminRoot = path.join(process.cwd(), "src", "app", "admin")
    const offenders = listSourceFiles(adminRoot)
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8")
        const containsServerAction =
          source.includes('"use server"') || source.includes("'use server'")
        const checksJwtDirectly = /await\s+auth\s*\(/.test(source)
        const revalidatesCurrentAccount = /authorizeAPI\s*\(\s*\[\s*["']ADMIN["']\s*\]\s*\)/.test(
          source
        )

        return containsServerAction && checksJwtDirectly && !revalidatesCurrentAccount
      })
      .map((file) => path.relative(process.cwd(), file).split(path.sep).join("/"))

    expect(offenders).toEqual([])
  })
})
