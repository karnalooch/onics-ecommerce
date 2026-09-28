import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("payment settings state fencing wiring", () => {
  it("publishes target-scoped state tokens to admins", () => {
    const route = read("src/app/api/payment-methods/route.ts")

    expect(route).toContain(
      "settingsStateToken: buildPaymentControlStateToken("
    )
    expect(route).toContain(
      "settingsStateToken: buildPaymentMethodStateToken("
    )
  })

  it("requires an observed token for every normal settings PUT", () => {
    const route = read("src/app/api/payment-methods/route.ts")

    expect(route).toContain("expectedStateToken:")
    expect(route).toContain(
      "parsed.data.expectedStateToken === undefined"
    )
    expect(route).toContain("{ status: 428 }")
  })

  it("rechecks global state after activation preflight and before mutation", () => {
    const route = read("src/app/api/payment-methods/route.ts")
    const globalStart = route.indexOf(
      'if (parsed.data.scope === "GLOBAL")'
    )
    const methodStart = route.indexOf(
      "const methodUpdate = parsed.data",
      globalStart
    )
    const flow = route.slice(globalStart, methodStart)

    expect(flow).toContain("observedControlToken !== initialControlToken")
    expect(flow).toContain("observedControlToken !== freshToken")
    expect(flow).toContain("isGlobalPaymentSettingsReplay(")
    const preflight = flow.indexOf("await validatePaymentProviderActivation(")
    expect(preflight).toBeGreaterThan(-1)
    expect(preflight).toBeLessThan(
      flow.indexOf("observedControlToken !== freshToken")
    )
    expect(flow.indexOf("observedControlToken !== freshToken"))
      .toBeLessThan(flow.indexOf("paymentControl.enabled ="))
  })

  it("rechecks method state after provider preflight and before write", () => {
    const route = read("src/app/api/payment-methods/route.ts")
    const methodStart = route.indexOf("const methodUpdate = parsed.data")
    const flow = route.slice(methodStart)

    expect(flow).toContain("observedMethodToken !== initialMethodToken")
    expect(flow).toContain("observedMethodToken !== freshToken")
    expect(flow).toContain("isMethodPaymentSettingsReplay(")
    const preflight = flow.indexOf("await validatePaymentProviderActivation(")
    expect(preflight).toBeGreaterThan(-1)
    expect(preflight).toBeLessThan(
      flow.indexOf("observedMethodToken !== freshToken")
    )
    expect(flow.indexOf("observedMethodToken !== freshToken"))
      .toBeLessThan(flow.indexOf("paymentMethods[method] ="))
  })

  it("rechecks current admin access under the write lock before every settings write", () => {
    const route = read("src/app/api/payment-methods/route.ts")
    const globalStart = route.indexOf(
      'if (parsed.data.scope === "GLOBAL")'
    )
    const methodStart = route.indexOf(
      "const methodUpdate = parsed.data",
      globalStart
    )
    const globalFlow = route.slice(globalStart, methodStart)
    const methodFlow = route.slice(methodStart)

    for (const [flow, write] of [
      [globalFlow, "paymentControl.enabled ="],
      [methodFlow, "paymentMethods[method] ="],
    ] as const) {
      const mutation = flow.indexOf("mutateMockData((db) =>")
      const guard = flow.indexOf("assertCurrentPaymentAdmin(", mutation)
      const writeIndex = flow.indexOf(write, guard)

      expect(mutation).toBeGreaterThan(-1)
      expect(guard).toBeGreaterThan(mutation)
      expect(writeIndex).toBeGreaterThan(guard)
    }

    expect(route).toContain("findStoredUserBySession(users, sessionUser)")
    expect(route).toContain(
      'hasAccountRoleAccess(currentActor, ["ADMIN"])'
    )
    expect(route).toContain('throw new Error("ADMIN_ACCESS_REVOKED")')
  })

  it("binds provider activation to the HTTP request lifetime", () => {
    const route = read("src/app/api/payment-methods/route.ts")
    const activation = read("src/lib/paymentProviderActivation.ts")
    const przelewy24 = read("src/lib/przelewy24.ts")

    expect(route).toContain("req.signal")
    expect(route).toContain('new Error("REQUEST_ABORTED")')
    expect(route).toContain("{ status: 499 }")
    expect(activation).toContain("requestSignal?: AbortSignal")
    expect(activation).toContain(
      "testPrzelewy24Access(config, requestSignal)"
    )
    expect(przelewy24).toContain("requestSignal?: AbortSignal")
    expect(przelewy24).toContain(
      "AbortSignal.any([requestSignal, AbortSignal.timeout(10_000)])"
    )
  })

  it("keeps emergency shutdown authoritative and unfenced", () => {
    const shutdown = read(
      "src/app/api/payment-methods/emergency-shutdown/route.ts"
    )

    expect(shutdown).toContain("paymentControl.enabled = false")
    expect(shutdown).not.toContain("expectedStateToken")
  })

  it("binds all normal payment settings writes to the observed token", () => {
    const page = read("src/app/admin/payments/page.tsx")

    expect(page).toContain(
      "expectedStateToken: control.settingsStateToken"
    )
    expect(page.match(/expectedStateToken: method\.settingsStateToken/g))
      .toHaveLength(2)
  })

  it("returns conflicts and exact replay metadata explicitly", () => {
    const route = read("src/app/api/payment-methods/route.ts")

    expect(route).toContain('code: "PAYMENT_SETTINGS_STATE_CONFLICT"')
    expect(route).toContain('"Idempotency-Replayed": "true"')
  })
})
