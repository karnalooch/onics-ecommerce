import {
  PAYMENT_ADMIN_ACTIONS,
  listAvailablePaymentAdminActions,
  type PaymentAdminAction,
  type PaymentAdminActionOrder,
} from "@/lib/paymentAdminActions"
import {
  PAYMENT_PROVIDER_IDS,
  resolveOrderPaymentProvider,
  type PaymentProviderId,
} from "@/lib/paymentProviders"

export type PaymentProviderOperationsOrder = PaymentAdminActionOrder & {
  id?: unknown
  paymentReconciledAt?: unknown
  refundUpdatedAt?: unknown
}

export type PaymentProviderOperationsSummary = {
  provider: PaymentProviderId
  totalOrders: number
  ordersRequiringAttention: number
  pendingPayments: number
  pendingRefunds: number
  failedRefunds: number
  openReturns: number
  lastReconciledAt: string | null
  lastErrorAt: string | null
  actionCounts: Record<PaymentAdminAction, number>
}

function emptyActionCounts(): Record<PaymentAdminAction, number> {
  return Object.fromEntries(
    PAYMENT_ADMIN_ACTIONS.map((action) => [action, 0])
  ) as Record<PaymentAdminAction, number>
}

function laterTimestamp(
  current: string | null,
  candidate: unknown
): string | null {
  if (typeof candidate !== "string") return current

  const timestamp = Date.parse(candidate)
  if (!Number.isFinite(timestamp)) return current
  if (!current) return candidate

  return timestamp > Date.parse(current) ? candidate : current
}

export function describePaymentProviderOperations(
  orders: PaymentProviderOperationsOrder[]
): Record<PaymentProviderId, PaymentProviderOperationsSummary> {
  const summaries = Object.fromEntries(
    PAYMENT_PROVIDER_IDS.map((provider) => [
      provider,
      {
        provider,
        totalOrders: 0,
        ordersRequiringAttention: 0,
        pendingPayments: 0,
        pendingRefunds: 0,
        failedRefunds: 0,
        openReturns: 0,
        lastReconciledAt: null,
        lastErrorAt: null,
        actionCounts: emptyActionCounts(),
      } satisfies PaymentProviderOperationsSummary,
    ])
  ) as Record<PaymentProviderId, PaymentProviderOperationsSummary>

  for (const order of orders) {
    const provider = resolveOrderPaymentProvider(order)
    if (!provider) continue

    const summary = summaries[provider]
    summary.totalOrders += 1

    const actions = listAvailablePaymentAdminActions(order)
    if (actions.length > 0) {
      summary.ordersRequiringAttention += 1
      for (const action of actions) {
        summary.actionCounts[action] += 1
      }
    }

    const paymentStatus =
      typeof order.paymentStatus === "string" ? order.paymentStatus : null
    const refundStatus =
      typeof order.refundStatus === "string" ? order.refundStatus : null
    const returnStatus =
      typeof order.returnStatus === "string" ? order.returnStatus : null

    if (paymentStatus === "PENDING") {
      summary.pendingPayments += 1
    }
    if (refundStatus === "pending" || refundStatus === "requires_action") {
      summary.pendingRefunds += 1
    }
    if (refundStatus === "failed" || refundStatus === "canceled") {
      summary.failedRefunds += 1
      summary.lastErrorAt = laterTimestamp(
        summary.lastErrorAt,
        order.refundUpdatedAt
      )
    }
    if (returnStatus && returnStatus !== "COMPLETED") {
      summary.openReturns += 1
    }

    summary.lastReconciledAt = laterTimestamp(
      summary.lastReconciledAt,
      order.paymentReconciledAt
    )
  }

  return summaries
}
