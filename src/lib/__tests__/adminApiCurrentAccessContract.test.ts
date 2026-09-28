import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ADMIN_AUTH_PATTERN =
  /authorizeAPI\s*\(\s*\[\s*["']ADMIN["']\s*\]\s*\)/
const STORE_WRITE_PATTERN = /mutateMockData\s*\(/
const CURRENT_ADMIN_FENCE_PATTERN =
  /hasAccountRoleAccess\s*\([\s\S]*?\[\s*["']ADMIN["']\s*\]/

const RECOVERY_EXCEPTIONS: Record<string, string[]> = {
  "src/app/api/payment-methods/reconcile/stripe/route.ts": [
    "refundRequestedAt",
    "stripeRefundRecoveryKey(currentOrder)",
    "stripe.refunds.create(",
  ],
  "src/app/api/payment-methods/reconcile/przelewy24/route.ts": [
    'refundStatus === "pending"',
    "p24RefundRequestId",
    "p24RefundsUuid",
    "requestPrzelewy24Refund(",
  ],
}

function listRouteFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) return listRouteFiles(absolute)
    return entry.name === "route.ts" ? [absolute] : []
  })
}

function relative(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join("/")
}

describe("admin API current-access contract", () => {
  it("requires current-account ADMIN fencing for every file-store admin write", () => {
    const root = path.join(process.cwd(), "src", "app", "api")
    const offenders: string[] = []
    const seenRecoveryExceptions = new Set<string>()

    for (const file of listRouteFiles(root)) {
      const source = fs.readFileSync(file, "utf8")
      const route = relative(file)

      if (!ADMIN_AUTH_PATTERN.test(source) || !STORE_WRITE_PATTERN.test(source)) {
        continue
      }

      const recoveryMarkers = RECOVERY_EXCEPTIONS[route]
      if (recoveryMarkers) {
        seenRecoveryExceptions.add(route)
        for (const marker of recoveryMarkers) {
          if (!source.includes(marker)) {
            offenders.push(
              `${route}: recovery exemption lost required marker ${marker}`
            )
          }
        }
        continue
      }

      if (!CURRENT_ADMIN_FENCE_PATTERN.test(source)) {
        offenders.push(
          `${route}: ADMIN file-store write lacks a current-account ADMIN fence`
        )
      }
    }

    for (const route of Object.keys(RECOVERY_EXCEPTIONS)) {
      if (!seenRecoveryExceptions.has(route)) {
        offenders.push(
          `${route}: recovery exemption is stale or no longer matches an ADMIN file-store write`
        )
      }
    }

    expect(offenders).toEqual([])
  })

  it("keeps recovery exemptions limited to already-staged provider recovery", () => {
    expect(Object.keys(RECOVERY_EXCEPTIONS).sort()).toEqual([
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts",
      "src/app/api/payment-methods/reconcile/stripe/route.ts",
    ])
  })
})
