import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("payment checkout idempotency wiring", () => {
  it("binds the browser retry key to the validated server response", () => {
    const page = read("src/app/koszyk/page.tsx")
    const start = page.indexOf("const handlePaymentCheckout = async")
    const end = page.indexOf("const handleAction = async", start)
    const flow = page.slice(start, end)

    expect(flow).toContain("getOrCreatePaymentCheckoutRequestId(")
    expect(flow).toContain("requestId,")
    expect(flow).toContain("checkout.clientRequestId !== requestId")
    expect(flow).toContain("clearPaymentCheckoutRequestId(requestId")
    expect(flow.indexOf("checkout.clientRequestId !== requestId"))
      .toBeLessThan(flow.indexOf("clearPaymentCheckoutRequestId(requestId"))
    expect(flow.indexOf("clearPaymentCheckoutRequestId(requestId"))
      .toBeLessThan(flow.indexOf("window.location.assign("))
  })

  it("requires the request id at checkout ingress", () => {
    const route = read("src/app/api/checkout/route.ts")
    expect(route).toContain("requestId: z.string().uuid()")
    expect(route).toContain("requestId: parsed.data.requestId")
    expect(route).toContain("clientRequestId: parsed.data.requestId")
    expect(route).toContain("PAYMENT_CHECKOUT_IDEMPOTENCY_KEY_REUSED")
    expect(route).toContain("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
  })

  it("checks local replay before a second bank-transfer stock reservation", () => {
    const source = read("src/lib/paymentProviderCheckout.ts")
    const start = source.indexOf("async function createBankTransferCheckout")
    const end = source.indexOf("async function createStripeCheckout", start)
    const flow = source.slice(start, end)

    expect(flow).toContain("findExistingPaymentCheckout(orderStore, input)")
    expect(flow).toContain("clientCheckoutRequestId: input.requestId")
    expect(flow.indexOf("findExistingPaymentCheckout(orderStore, input)"))
      .toBeLessThan(flow.indexOf("reserveInventory("))
  })

  it("stages P24 locally before registration and never blindly retries an uncertain registration", () => {
    const source = read("src/lib/paymentProviderCheckout.ts")
    const start = source.indexOf("async function createPrzelewy24Checkout")
    const end = source.indexOf("async function createBankTransferCheckout", start)
    const flow = source.slice(start, end)

    expect(flow).toContain('paymentCheckoutRegistrationStatus: "PENDING"')
    expect(flow).toContain("p24CheckoutRedirectUrl: null")
    expect(flow).toContain("PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN")
    expect(flow.indexOf("orderStore.unshift(order)"))
      .toBeLessThan(flow.indexOf("registerPrzelewy24Transaction("))
  })

  it("stages Stripe locally and uses provider-native idempotency for session creation", () => {
    const source = read("src/lib/paymentProviderCheckout.ts")
    const start = source.indexOf("async function createStripeCheckout")
    const end = source.indexOf("const paymentCheckoutAdapters", start)
    const flow = source.slice(start, end)

    expect(flow).toContain('paymentCheckoutRegistrationStatus: "PENDING"')
    expect(flow).toContain("stripeCheckoutSessionId: null")
    expect(flow).toContain("idempotencyKey:")
    expect(flow).toContain("onics-checkout:")
    expect(flow.indexOf("reserveInventory("))
      .toBeLessThan(flow.indexOf("stripe.checkout.sessions.create("))
  })

  it("keeps replay fingerprints and provider redirect recovery metadata internal", () => {
    const route = read("src/app/api/orders/route.ts")
    expect(route).toContain("clientCheckoutFingerprint: internalCheckoutFingerprint")
    expect(route).toContain("p24CheckoutRedirectUrl: internalP24RedirectUrl")
    expect(route).toContain("paymentCheckoutRegistrationStatus: internalCheckoutRegistrationStatus")
  })
})
