import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROUTES = [
  "src/app/api/orders/payment-action/route.ts",
  "src/app/api/orders/cancel/route.ts",
  "src/app/api/orders/return/route.ts",
  "src/app/api/orders/przelewy24-return/route.ts",
] as const

describe("provider admin JSON ingress wiring", () => {
  it.each(ROUTES)(
    "%s uses bounded JSON parsing after authorization",
    (relativePath) => {
      const source = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        "utf8"
      )
      const authorizationIndex = source.indexOf("authorizeAPI(")
      const boundedReadIndex = source.indexOf("readCommerceJson(req")

      expect(source).toContain('from "@/lib/commerceIngress"')
      expect(source).not.toContain("req.json()")
      expect(authorizationIndex).toBeGreaterThanOrEqual(0)
      expect(boundedReadIndex).toBeGreaterThan(authorizationIndex)
    }
  )
})
