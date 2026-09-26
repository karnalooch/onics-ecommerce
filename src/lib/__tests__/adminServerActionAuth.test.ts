import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ADMIN_AUTH_PATTERN =
  /authorizeAPI\s*\(\s*\[\s*["']ADMIN["']\s*\]\s*\)/

function listSourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) return listSourceFiles(absolutePath)
    return /\.(ts|tsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

function relativePath(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join("/")
}

function isServerActionSource(source: string) {
  return source.includes('"use server"') || source.includes("'use server'")
}

function exportedActionSources(source: string) {
  const patterns = [
    /export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*async\b/g,
  ]
  const matches = patterns
    .flatMap((pattern) =>
      [...source.matchAll(pattern)].map((match) => ({
        index: match.index ?? 0,
        name: match[1],
        length: match[0].length,
      }))
    )
    .sort((left, right) => left.index - right.index)

  return matches.map((match, index) => {
    const next = matches[index + 1]
    return {
      name: match.name,
      source: source.slice(
        match.index + match.length,
        next?.index ?? source.length
      ),
    }
  })
}

describe("admin server action authorization contract", () => {
  it("requires every admin server-action file to revalidate the current account", () => {
    const adminRoot = path.join(process.cwd(), "src", "app", "admin")
    const offenders = listSourceFiles(adminRoot)
      .map((file) => ({
        file,
        source: fs.readFileSync(file, "utf8"),
      }))
      .filter(({ source }) => isServerActionSource(source))
      .flatMap(({ file, source }) => {
        const failures: string[] = []

        if (/await\s+auth\s*\(/.test(source)) {
          failures.push("uses JWT-only auth()")
        }
        if (!ADMIN_AUTH_PATTERN.test(source)) {
          failures.push("does not revalidate ADMIN with authorizeAPI()")
        }

        return failures.map(
          (failure) => `${relativePath(file)}: ${failure}`
        )
      })

    expect(offenders).toEqual([])
  })

  it("requires every exported admin action to invoke the reviewed admin guard", () => {
    const adminRoot = path.join(process.cwd(), "src", "app", "admin")
    const offenders = listSourceFiles(adminRoot)
      .map((file) => ({
        file,
        source: fs.readFileSync(file, "utf8"),
      }))
      .filter(({ source }) => isServerActionSource(source))
      .flatMap(({ file, source }) =>
        exportedActionSources(source)
          .filter(
            (action) =>
              !ADMIN_AUTH_PATTERN.test(action.source) &&
              !/requireAdminAction\s*\(/.test(action.source)
          )
          .map(
            (action) =>
              `${relativePath(file)}:${action.name} does not invoke an admin guard`
          )
      )

    expect(offenders).toEqual([])
  })
})
