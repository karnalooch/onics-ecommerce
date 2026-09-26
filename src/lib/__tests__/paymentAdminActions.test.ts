import {
  PAYMENT_ADMIN_ACTIONS,
  requiredPaymentAdminCapabilities,
  resolvePaymentAdminActionTarget,
} from "../paymentAdminActions"

describe("payment admin action dispatcher", () => {
  it("keeps the public admin action vocabulary stable", () => {
    expect(PAYMENT_ADMIN_ACTIONS).toEqual([
      "CANCEL",
      "CONFIRM_PAYMENT",
      "CONFIRM_REFUND",
      "REQUEST_RETURN",
      "RECEIVE_RETURN",
      "CONFIRM_RETURN_REFUND",
    ])
  })

  it("routes Stripe lifecycle actions without exposing Stripe details to UI", () => {
    expect(resolvePaymentAdminActionTarget("STRIPE", "CANCEL")).toEqual({
      handler: "STRIPE_CANCEL",
    })
    expect(resolvePaymentAdminActionTarget("STRIPE", "REQUEST_RETURN")).toEqual({
      handler: "STRIPE_RETURN",
      action: "REQUEST",
    })
    expect(resolvePaymentAdminActionTarget("STRIPE", "RECEIVE_RETURN")).toEqual({
      handler: "STRIPE_RETURN",
      action: "RECEIVE",
    })
  })

  it("routes manual bank-transfer operations behind the same action contract", () => {
    expect(
      resolvePaymentAdminActionTarget("BANK_TRANSFER", "CONFIRM_PAYMENT")
    ).toEqual({
      handler: "BANK_TRANSFER",
      action: "CONFIRM_PAYMENT",
    })
    expect(resolvePaymentAdminActionTarget("BANK_TRANSFER", "CANCEL")).toEqual({
      handler: "ORDER_CANCEL",
    })
    expect(
      resolvePaymentAdminActionTarget(
        "BANK_TRANSFER",
        "CONFIRM_RETURN_REFUND"
      )
    ).toEqual({
      handler: "BANK_TRANSFER",
      action: "CONFIRM_RETURN_REFUND",
    })
  })

  it("fails closed for actions a provider does not implement", () => {
    expect(() =>
      resolvePaymentAdminActionTarget("STRIPE", "CONFIRM_PAYMENT")
    ).toThrow("PAYMENT_ADMIN_ACTION_UNSUPPORTED")
    expect(() =>
      resolvePaymentAdminActionTarget("STRIPE", "CONFIRM_RETURN_REFUND")
    ).toThrow("PAYMENT_ADMIN_ACTION_UNSUPPORTED")
  })

  it("declares the capability contract for destructive actions", () => {
    expect(requiredPaymentAdminCapabilities("CONFIRM_REFUND")).toEqual([
      "cancel",
      "refund",
      "manualSettlement",
    ])
    expect(requiredPaymentAdminCapabilities("CONFIRM_RETURN_REFUND")).toEqual([
      "rma",
      "refund",
      "manualSettlement",
    ])
  })
})
