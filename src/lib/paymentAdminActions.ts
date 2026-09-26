import {
  assertPaymentProviderCapability,
  getPaymentProviderDefinition,
  resolveOrderPaymentProvider,
  type PaymentProviderCapability,
  type PaymentProviderId,
  type PaymentProviderOrderIdentity,
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

export type PaymentAdminActionOrder = PaymentProviderOrderIdentity & {
  status?: unknown
  paymentStatus?: unknown
  refundStatus?: unknown
  returnStatus?: unknown
}

export type PaymentAdminActionTarget =
  | { handler: "STRIPE_CANCEL" }
  | { handler: "STRIPE_RETURN"; action: "REQUEST" | "RECEIVE" }
  | { handler: "PRZELEWY24_RETURN"; action: "REQUEST" | "RECEIVE" }
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

const providerTargets: Partial<
  Record<
    PaymentProviderId,
    Partial<Record<PaymentAdminAction, PaymentAdminActionTarget>>
  >
> = {
  STRIPE: {
    CANCEL: { handler: "STRIPE_CANCEL" },
    REQUEST_RETURN: { handler: "STRIPE_RETURN", action: "REQUEST" },
    RECEIVE_RETURN: { handler: "STRIPE_RETURN", action: "RECEIVE" },
  },
  PRZELEWY24: {
    REQUEST_RETURN: {
      handler: "PRZELEWY24_RETURN",
      action: "REQUEST",
    },
    RECEIVE_RETURN: {
      handler: "PRZELEWY24_RETURN",
      action: "RECEIVE",
    },
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
  const target = providerTargets[provider]?.[action]
  if (!target) throw new Error("PAYMENT_ADMIN_ACTION_UNSUPPORTED")

  for (const capability of requiredCapabilities[action]) {
    assertPaymentProviderCapability(provider, capability)
  }

  return target
}

function supportsPaymentAdminAction(
  provider: PaymentProviderId,
  action: PaymentAdminAction
) {
  try {
    resolvePaymentAdminActionTarget(provider, action)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "PAYMENT_ADMIN_ACTION_UNSUPPORTED" ||
        error.message === "PAYMENT_PROVIDER_CAPABILITY_UNSUPPORTED")
    ) {
      return false
    }
    throw error
  }
}

export function listAvailablePaymentAdminActions(
  order: PaymentAdminActionOrder
): PaymentAdminAction[] {
  const provider = resolveOrderPaymentProvider(order)
  if (!provider) return []

  const status = typeof order.status === "string" ? order.status : null
  const paymentStatus =
    typeof order.paymentStatus === "string" ? order.paymentStatus : null
  const refundStatus =
    typeof order.refundStatus === "string" ? order.refundStatus : null
  const returnStatus =
    typeof order.returnStatus === "string" ? order.returnStatus : null

  const terminalOrder =
    status === "CANCELLED" || status === "RETURNED"
  if (terminalOrder) return []

  const refundInProgress =
    refundStatus === "pending" || refundStatus === "requires_action"
  const actions: PaymentAdminAction[] = []
  const add = (action: PaymentAdminAction, available: boolean) => {
    if (
      available &&
      supportsPaymentAdminAction(provider, action)
    ) {
      actions.push(action)
    }
  }

  const providerKind = getPaymentProviderDefinition(provider).kind

  if (providerKind === "MANUAL") {
    add(
      "CANCEL",
      status !== "SHIPPED" &&
        paymentStatus === "PENDING"
    )
    add(
      "CONFIRM_PAYMENT",
      status !== "SHIPPED" &&
        paymentStatus === "PENDING"
    )
    add(
      "CONFIRM_REFUND",
      status !== "SHIPPED" &&
        paymentStatus === "PAID"
    )
    add(
      "REQUEST_RETURN",
      status === "SHIPPED" &&
        paymentStatus === "PAID" &&
        !returnStatus
    )
    add(
      "RECEIVE_RETURN",
      status === "SHIPPED" &&
        paymentStatus === "PAID" &&
        returnStatus === "REQUESTED"
    )
    add(
      "CONFIRM_RETURN_REFUND",
      status === "SHIPPED" &&
        paymentStatus === "PAID" &&
        returnStatus === "RECEIVED"
    )
    return actions
  }

  add(
    "CANCEL",
    status !== "SHIPPED" &&
      !refundInProgress
  )
  add(
    "REQUEST_RETURN",
    status === "SHIPPED" &&
      (paymentStatus === "PAID" || paymentStatus === "REFUNDED") &&
      !returnStatus
  )
  add(
    "RECEIVE_RETURN",
    status === "SHIPPED" &&
      (paymentStatus === "PAID" || paymentStatus === "REFUNDED") &&
      (returnStatus === "REQUESTED" ||
        returnStatus === "RECEIVED" ||
        returnStatus === "REFUND_PENDING")
  )

  return actions
}
