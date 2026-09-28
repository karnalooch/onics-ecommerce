import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const COMMERCE_JSON_ROUTES = [
  "src/app/api/checkout/route.ts",
  "src/app/api/cart/preview/route.ts",
  "src/app/api/cart/offer-preview/route.ts",
] as const

describe("commerce JSON ingress wiring", () => {
  it.each(COMMERCE_JSON_ROUTES)(
    "%s uses bounded JSON parsing after authorization",
    (relativePath) => {
      const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
      const authorizationIndex = source.indexOf("authorizeAPI(")
      const boundedReadIndex = source.indexOf("readCommerceJson(req)")

      expect(source).toContain('from "@/lib/commerceIngress"')
      expect(source).not.toContain("req.json()")
      expect(authorizationIndex).toBeGreaterThanOrEqual(0)
      expect(boundedReadIndex).toBeGreaterThan(authorizationIndex)
    }
  )
})
