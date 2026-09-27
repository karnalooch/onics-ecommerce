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
    expect(flow.indexOf("await validatePaymentProviderActivation(method)"))
      .toBeLessThan(flow.indexOf("observedControlToken !== freshToken"))
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
    expect(flow.indexOf("await validatePaymentProviderActivation(method)"))
      .toBeLessThan(flow.indexOf("observedMethodToken !== freshToken"))
    expect(flow.indexOf("observedMethodToken !== freshToken"))
      .toBeLessThan(flow.indexOf("paymentMethods[method] ="))
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
