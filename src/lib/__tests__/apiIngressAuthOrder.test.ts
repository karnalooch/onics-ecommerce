import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const

type MutationMethod = (typeof MUTATING_METHODS)[number]

function listRouteFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) return listRouteFiles(absolutePath)
    return entry.name === "route.ts" ? [absolutePath] : []
  })
}

function normalizePath(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join("/")
}

function handlerSource(source: string, method: MutationMethod) {
  const patterns = [
    new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`),
    new RegExp(`export\\s+const\\s+${method}\\s*=`),
  ]

  const matches = patterns
    .map((pattern) => pattern.exec(source))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .sort((left, right) => left.index - right.index)

  const match = matches[0]
  if (!match) return null

  const rest = source.slice(match.index + match[0].length)
  const nextHandler =
    /export\s+(?:async\s+function\s+|const\s+)(?:GET|POST|PUT|PATCH|DELETE)\b/.exec(
      rest
    )

  return nextHandler ? rest.slice(0, nextHandler.index) : rest
}

function firstBodyReadIndex(source: string) {
  const matches = [
    /req\.(?:json|text|formData|arrayBuffer)\s*\(/.exec(source),
    /read[A-Za-z0-9]*(?:Json|Body|FormData)\s*\(\s*req\b/.exec(source),
  ].filter((match): match is RegExpExecArray => Boolean(match))

  return matches.length > 0
    ? Math.min(...matches.map((match) => match.index))
    : -1
}

describe("API ingress authorization order", () => {
  it("authenticates protected mutating routes before buffering request bodies", () => {
    const apiRoot = path.join(process.cwd(), "src", "app", "api")
    const offenders: string[] = []

    for (const file of listRouteFiles(apiRoot)) {
      const source = fs.readFileSync(file, "utf8")
      const relativePath = normalizePath(file)

      for (const method of MUTATING_METHODS) {
        const handler = handlerSource(source, method)
        if (!handler) continue

        const authorizationIndex = handler.indexOf("authorizeAPI(")
        if (authorizationIndex < 0) continue

        const bodyReadIndex = firstBodyReadIndex(handler)
        if (bodyReadIndex >= 0 && bodyReadIndex < authorizationIndex) {
          offenders.push(
            `${relativePath}:${method} reads the request body before authorizeAPI()`
          )
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
