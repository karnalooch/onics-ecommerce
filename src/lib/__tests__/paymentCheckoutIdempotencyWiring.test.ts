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
    expect(route).toContain("PAYMENT_CHECKOUT_AVAILABILITY_CHANGED")
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
    expect(flow).toContain("buildPaymentCheckoutAvailabilityFence(")
    expect(flow).toContain("assertPaymentCheckoutAvailabilityFence(")
    expect(flow.indexOf("buildPaymentCheckoutAvailabilityFence("))
      .toBeLessThan(flow.indexOf("registerPrzelewy24Transaction("))
    expect(flow.indexOf("registerPrzelewy24Transaction("))
      .toBeLessThan(flow.indexOf("assertPaymentCheckoutAvailabilityFence("))
    expect(flow.indexOf("assertPaymentCheckoutAvailabilityFence("))
      .toBeLessThan(flow.indexOf("existing.p24CheckoutRedirectUrl ="))
    expect(flow.indexOf("orderStore.unshift(order)"))
      .toBeLessThan(flow.indexOf("registerPrzelewy24Transaction("))
  })

  it("stages Stripe locally and uses one provider-native replay helper", () => {
    const source = read("src/lib/paymentProviderCheckout.ts")
    const helperStart = source.indexOf(
      "export async function createOrRecoverStripeCheckoutSession"
    )
    const checkoutStart = source.indexOf("async function createStripeCheckout")
    const checkoutEnd = source.indexOf(
      "const paymentCheckoutAdapters",
      checkoutStart
    )
    const helper = source.slice(helperStart, checkoutStart)
    const flow = source.slice(checkoutStart, checkoutEnd)

    expect(flow).toContain('paymentCheckoutRegistrationStatus: "PENDING"')
    expect(flow).toContain("stripeCheckoutSessionId: null")
    expect(flow).toContain("createOrRecoverStripeCheckoutSession(")
    expect(flow).toContain("buildPaymentCheckoutAvailabilityFence(")
    expect(flow).toContain("assertPaymentCheckoutAvailabilityFence(")
    expect(flow).toContain("settleStripeCheckoutAvailabilityRace(")
    expect(flow).not.toContain(
      "input.snapshot.paymentControl,\n    input.snapshot.paymentMethods"
    )
    expect(helper).toContain("stripe.checkout.sessions.create(")
    expect(helper).toContain("idempotencyKey:")
    expect(helper).toContain("onics-checkout:")
    expect(flow.indexOf("reserveInventory("))
      .toBeLessThan(flow.indexOf("createOrRecoverStripeCheckoutSession("))
    expect(flow.indexOf("createOrRecoverStripeCheckoutSession("))
      .toBeLessThan(flow.indexOf("assertPaymentCheckoutAvailabilityFence("))
    expect(flow.indexOf("assertPaymentCheckoutAvailabilityFence("))
      .toBeLessThan(flow.indexOf("existing.stripeCheckoutSessionId = session.id"))
    expect(flow.indexOf("existing.stripeCheckoutSessionId = session.id"))
      .toBeLessThan(flow.lastIndexOf("if (!session.url)"))
  })

  it("expires a fresh Stripe session before releasing stock after an availability race", () => {
    const source = read("src/lib/paymentProviderCheckout.ts")
    const start = source.indexOf(
      "async function settleStripeCheckoutAvailabilityRace"
    )
    const end = source.indexOf("async function createStripeCheckout", start)
    const flow = source.slice(start, end)

    expect(flow).toContain("stripe.checkout.sessions.expire(")
    expect(flow).toContain("stripe.checkout.sessions.retrieve(")
    expect(flow).toContain("existing.stripeCheckoutSessionId = providerSession.id")
    expect(flow).toContain("applyExpiredCheckoutCancellation(")
    expect(flow.indexOf('providerSession.status === "expired"'))
      .toBeLessThan(flow.indexOf("applyExpiredCheckoutCancellation("))
  })

  it("reconciles a sessionless Stripe registration through the same replay helper", () => {
    const route = read(
      "src/app/api/payment-methods/reconcile/stripe/route.ts"
    )

    expect(route).toContain("createOrRecoverStripeCheckoutSession(")
    expect(route).toContain(
      'snapshotOrder.paymentCheckoutRegistrationStatus !== "PENDING"'
    )
    expect(route).toContain(
      'snapshotOrder.paymentCheckoutRegistrationStatus !== "UNCERTAIN"'
    )
    expect(route).toContain(
      'order.paymentCheckoutRegistrationStatus = "READY"'
    )
    expect(route).toContain("PAYMENT_CHECKOUT_PROVIDER_REPLAY_MISMATCH")
    expect(route).toContain("isPaymentControlEnabled(")
    expect(route).toContain("isPaymentMethodEnabled(")
  })

  it("keeps replay fingerprints and provider redirect recovery metadata internal", () => {
    const route = read("src/app/api/orders/route.ts")
    expect(route).toContain("clientCheckoutFingerprint: internalCheckoutFingerprint")
    expect(route).toContain("p24CheckoutRedirectUrl: internalP24RedirectUrl")
    expect(route).toContain("paymentCheckoutRegistrationStatus: internalCheckoutRegistrationStatus")
  })
})
