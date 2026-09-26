import { describe, expect, it } from "vitest"
import {
  PAYMENT_ADMIN_ACTIONS,
  listAvailablePaymentAdminActions,
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

  it("derives pending manual-payment actions from order state", () => {
    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
      })
    ).toEqual(["CANCEL", "CONFIRM_PAYMENT"])
  })

  it("switches a paid manual order from refund to the RMA lifecycle", () => {
    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "CONFIRMED",
        paymentStatus: "PAID",
      })
    ).toEqual(["CONFIRM_REFUND"])

    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "SHIPPED",
        paymentStatus: "PAID",
      })
    ).toEqual(["REQUEST_RETURN"])

    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "SHIPPED",
        paymentStatus: "PAID",
        returnStatus: "REQUESTED",
      })
    ).toEqual(["RECEIVE_RETURN"])

    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "SHIPPED",
        paymentStatus: "PAID",
        returnStatus: "RECEIVED",
      })
    ).toEqual(["CONFIRM_RETURN_REFUND"])
  })

  it("keeps automated refund/RMA retry states available without exposing manual actions", () => {
    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "STRIPE",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
      })
    ).toEqual(["CANCEL"])

    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "STRIPE",
        status: "SHIPPED",
        paymentStatus: "PAID",
        returnStatus: "REFUND_PENDING",
        refundStatus: "pending",
      })
    ).toEqual(["RECEIVE_RETURN"])
  })

  it("returns no destructive actions for terminal or unknown payment orders", () => {
    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "BANK_TRANSFER",
        status: "CANCELLED",
        paymentStatus: "PENDING",
      })
    ).toEqual([])
    expect(
      listAvailablePaymentAdminActions({
        paymentProvider: "UNKNOWN",
        status: "PENDING_VERIFICATION",
        paymentStatus: "PENDING",
      })
    ).toEqual([])
  })

})
