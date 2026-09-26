import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const

type MutationMethod = (typeof MUTATING_METHODS)[number]

type ExplicitMutationGuard = {
  handlerMarkers: string[]
  fileMarkers?: string[]
  beforeMutationMarker?: string
}

const EXPLICIT_NON_SESSION_GUARDS: Record<string, ExplicitMutationGuard> = {
  "src/app/api/admin/import/route.ts:POST": {
    handlerMarkers: [
      "process.env.WF_MAG_SECRET",
      'req.headers.get("authorization")',
      "safeEqual(",
    ],
    fileMarkers: ["crypto.timingSafeEqual("],
  },
  "src/app/api/register/route.ts:POST": {
    handlerMarkers: [
      "applicationRateLimiter.check(",
      'roleType: "BIZ"',
      "isApproved: false",
      "isBlocked: false",
    ],
    beforeMutationMarker: "mutateMockData(",
  },
  "src/app/api/webhooks/stripe/route.ts:POST": {
    handlerMarkers: [
      "process.env.STRIPE_WEBHOOK_SECRET",
      'req.headers.get("stripe-signature")',
      "stripe.webhooks.constructEvent(",
    ],
    beforeMutationMarker: "applyCheckoutStatus(",
  },
  "src/app/api/webhooks/przelewy24/route.ts:POST": {
    handlerMarkers: [
      "resolvePrzelewy24Config()",
      "verifyPrzelewy24NotificationSignature(",
    ],
    beforeMutationMarker: "mutateMockData(",
  },
  "src/app/api/webhooks/przelewy24/refund/route.ts:POST": {
    handlerMarkers: [
      "resolvePrzelewy24Config()",
      "verifyPrzelewy24RefundNotificationSignature(",
    ],
    beforeMutationMarker: "mutateMockData(",
  },
}

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
    new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(`
    ),
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

function firstMutationIndex(source: string) {
  const markers = [
    "mutateMockData(",
    "writeFile(",
    "writeFileSync(",
    "unlink(",
    "unlinkSync(",
    "rename(",
    "renameSync(",
  ]

  const indexes = markers
    .map((marker) => source.indexOf(marker))
    .filter((index) => index >= 0)

  return indexes.length > 0 ? Math.min(...indexes) : -1
}

describe("API mutation authorization boundary", () => {
  it("requires every mutating route handler to declare a reviewed guard", () => {
    const apiRoot = path.join(process.cwd(), "src", "app", "api")
    const offenders: string[] = []
    const discoveredExplicitGuards = new Set<string>()

    for (const file of listRouteFiles(apiRoot)) {
      const source = fs.readFileSync(file, "utf8")
      const relativePath = normalizePath(file)

      for (const method of MUTATING_METHODS) {
        const handler = handlerSource(source, method)
        if (!handler) continue

        const key = `${relativePath}:${method}`
        const sessionGuardIndex = handler.indexOf("authorizeAPI(")

        if (sessionGuardIndex >= 0) {
          const mutationIndex = firstMutationIndex(handler)
          if (mutationIndex >= 0 && sessionGuardIndex > mutationIndex) {
            offenders.push(`${key} authenticates after a local mutation starts`)
          }
          continue
        }

        const explicitGuard = EXPLICIT_NON_SESSION_GUARDS[key]
        if (!explicitGuard) {
          offenders.push(
            `${key} has no authorizeAPI() call and no reviewed explicit guard`
          )
          continue
        }

        discoveredExplicitGuards.add(key)

        const missingMarkers = explicitGuard.handlerMarkers.filter(
          (marker) => !handler.includes(marker)
        )
        if (missingMarkers.length > 0) {
          offenders.push(
            `${key} is missing guard marker(s): ${missingMarkers.join(", ")}`
          )
          continue
        }

        const missingFileMarkers = (explicitGuard.fileMarkers || []).filter(
          (marker) => !source.includes(marker)
        )
        if (missingFileMarkers.length > 0) {
          offenders.push(
            `${key} is missing file guard marker(s): ${missingFileMarkers.join(", ")}`
          )
          continue
        }

        if (explicitGuard.beforeMutationMarker) {
          const guardIndex = Math.max(
            ...explicitGuard.handlerMarkers.map((marker) => handler.indexOf(marker))
          )
          const mutationIndex = handler.indexOf(
            explicitGuard.beforeMutationMarker
          )

          if (mutationIndex >= 0 && guardIndex > mutationIndex) {
            offenders.push(
              `${key} verifies its explicit guard after ${explicitGuard.beforeMutationMarker}`
            )
          }
        }
      }
    }

    const staleExplicitGuards = Object.keys(EXPLICIT_NON_SESSION_GUARDS).filter(
      (key) => !discoveredExplicitGuards.has(key)
    )

    expect({
      offenders,
      staleExplicitGuards,
    }).toEqual({
      offenders: [],
      staleExplicitGuards: [],
    })
  })
})
