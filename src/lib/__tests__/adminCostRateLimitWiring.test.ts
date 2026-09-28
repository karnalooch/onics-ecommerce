import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"
import {
  ADMIN_COST_RATE_LIMIT_POLICIES,
  adminCostRateLimitKey,
} from "@/lib/adminCostRateLimit"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

const ROUTES = {
  ai: "src/app/api/products/ai-description/route.ts",
  train: "src/app/api/knowledge/train/route.ts",
  stream: "src/app/api/knowledge/train/stream/route.ts",
  validate: "src/app/api/knowledge/validate-key/route.ts",
} as const

describe("admin external-cost abuse protection", () => {
  it("keys limits to the current account identity", () => {
    expect(adminCostRateLimitKey({ id: "u-1", email: "A@EXAMPLE.TEST" })).toBe(
      "id:u-1"
    )
    expect(adminCostRateLimitKey({ email: " A@EXAMPLE.TEST " })).toBe(
      "email:a@example.test"
    )
    expect(adminCostRateLimitKey({})).toBe("account:unknown")
  })

  it("keeps knowledge training on one shared hourly budget", () => {
    expect(ADMIN_COST_RATE_LIMIT_POLICIES["knowledge-training"]).toEqual({
      limit: 4,
      windowMs: 60 * 60_000,
    })

    for (const routePath of [ROUTES.train, ROUTES.stream]) {
      const source = read(routePath)
      expect(source).toContain(
        'checkAdminCostLimit("knowledge-training", authCheck.user)'
      )
    }
  })

  it("bounds JSON before expensive work and removes raw req.json reads", () => {
    for (const routePath of Object.values(ROUTES)) {
      const source = read(routePath)
      expect(source).not.toContain("await req.json()")
      expect(source).toContain("readCommerceJson(")
      expect(source.indexOf("checkAdminCostLimit(")).toBeLessThan(
        source.indexOf("readCommerceJson(")
      )
    }

    const ai = read(ROUTES.ai)
    expect(ai).toContain("AI_DESCRIPTION_CONTEXT_MAX_CHARS")
    expect(ai.indexOf("checkAdminCostLimit(")).toBeLessThan(
      ai.indexOf("await fetch(url")
    )

    const validate = read(ROUTES.validate)
    expect(validate.indexOf("checkAdminCostLimit(")).toBeLessThan(
      validate.indexOf("await fetch(")
    )
  })

  it("rechecks the 25 MB file ceiling before both training paths read files", () => {
    for (const routePath of [ROUTES.train, ROUTES.stream]) {
      const source = read(routePath)
      expect(source).toContain("MAX_KNOWLEDGE_UPLOAD_BYTES")
      expect(source.indexOf("fs.statSync(")).toBeLessThan(
        source.indexOf("fs.readFileSync(")
      )
    }
  })
})
