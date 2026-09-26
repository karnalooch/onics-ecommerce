import {
  assertPaymentProviderCapability,
  type PaymentProviderCapability,
  type PaymentProviderId,
} from "@/lib/paymentProviders"

export const PAYMENT_ADMIN_ACTIONS = [
  "CANCEL",
  "CONFIRM_PAYMENT",
  "CONFIRM_REFUND",
  "REQUEST_RETURN",
  "RECEIVE_RETURN",
  "CONFIRM_RETURN_REFUND",
] as const

export type PaymentAdminAction = (typeof PAYMENT_ADMIN_ACTIONS)[number]

export type PaymentAdminActionTarget =
  | { handler: "STRIPE_CANCEL" }
  | { handler: "STRIPE_RETURN"; action: "REQUEST" | "RECEIVE" }
  | {
      handler: "BANK_TRANSFER"
      action:
        | "CONFIRM_PAYMENT"
        | "CONFIRM_REFUND"
        | "REQUEST_RETURN"
        | "RECEIVE_RETURN"
        | "CONFIRM_RETURN_REFUND"
    }
  | { handler: "ORDER_CANCEL" }

const requiredCapabilities: Record<
  PaymentAdminAction,
  PaymentProviderCapability[]
> = {
  CANCEL: ["cancel"],
  CONFIRM_PAYMENT: ["manualSettlement"],
  CONFIRM_REFUND: ["cancel", "refund", "manualSettlement"],
  REQUEST_RETURN: ["rma"],
  RECEIVE_RETURN: ["rma"],
  CONFIRM_RETURN_REFUND: ["rma", "refund", "manualSettlement"],
}

const providerTargets: Record<
  PaymentProviderId,
  Partial<Record<PaymentAdminAction, PaymentAdminActionTarget>>
> = {
  STRIPE: {
    CANCEL: { handler: "STRIPE_CANCEL" },
    REQUEST_RETURN: { handler: "STRIPE_RETURN", action: "REQUEST" },
    RECEIVE_RETURN: { handler: "STRIPE_RETURN", action: "RECEIVE" },
  },
  BANK_TRANSFER: {
    CANCEL: { handler: "ORDER_CANCEL" },
    CONFIRM_PAYMENT: {
      handler: "BANK_TRANSFER",
      action: "CONFIRM_PAYMENT",
    },
    CONFIRM_REFUND: {
      handler: "BANK_TRANSFER",
      action: "CONFIRM_REFUND",
    },
    REQUEST_RETURN: {
      handler: "BANK_TRANSFER",
      action: "REQUEST_RETURN",
    },
    RECEIVE_RETURN: {
      handler: "BANK_TRANSFER",
      action: "RECEIVE_RETURN",
    },
    CONFIRM_RETURN_REFUND: {
      handler: "BANK_TRANSFER",
      action: "CONFIRM_RETURN_REFUND",
    },
  },
}

export function requiredPaymentAdminCapabilities(
  action: PaymentAdminAction
): PaymentProviderCapability[] {
  return [...requiredCapabilities[action]]
}

export function resolvePaymentAdminActionTarget(
  provider: PaymentProviderId,
  action: PaymentAdminAction
): PaymentAdminActionTarget {
  const target = providerTargets[provider][action]
  if (!target) throw new Error("PAYMENT_ADMIN_ACTION_UNSUPPORTED")

  for (const capability of requiredCapabilities[action]) {
    assertPaymentProviderCapability(provider, capability)
  }

  return target
}
