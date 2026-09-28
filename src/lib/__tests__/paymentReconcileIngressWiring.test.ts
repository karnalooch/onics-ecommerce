import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("payment reconciliation ingress contract", () => {
  it("requires an explicit bulk scope in provider reconcile handlers", () => {
    for (const relativePath of [
      "src/app/api/payment-methods/reconcile/stripe/route.ts",
      "src/app/api/payment-methods/reconcile/przelewy24/route.ts",
    ]) {
      const route = read(relativePath)

      expect(route).toContain('z.object({ scope: z.literal("bulk") }).strict()')
      expect(route).not.toContain("catch(() => ({}))")
      expect(route).not.toContain("req.json()")
    }
  })

  it("preserves single-order reconcile while forwarding bulk explicitly", () => {
    const route = read("src/app/api/payment-methods/reconcile/route.ts")

    expect(route).toContain('scope: z.literal("bulk")')
    expect(route).toContain('orderId: z.string().min(1)')
    expect(route).toContain('orderId ? { orderId } : { scope: "bulk" }')
    expect(route).not.toContain("catch(() => ({}))")
  })

  it("makes the admin payments bulk action explicit", () => {
    const page = read("src/app/admin/payments/page.tsx")

    expect(page).toContain(
      'body: JSON.stringify({ provider: method.id, scope: "bulk" })'
    )
  })
})
