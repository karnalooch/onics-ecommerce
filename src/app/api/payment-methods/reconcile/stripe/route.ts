import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
import {
  nextPaymentStatus,
  resolveStripeCheckoutConfig,
  verifyCheckoutPayment,
  verifyStripeRefund,
} from "@/lib/payments"
import {
  applyExpiredCheckoutCancellation,
  applyStripeRefundSnapshot,
  type StripeCancelableOrder,
  type StripeRefundStatus,
} from "@/lib/refunds"
import {
  applyStripeInventoryTransition,
  type InventoryProduct,
} from "@/lib/inventoryReservations"
import {
  classifyStripeCheckoutForReconciliation,
  shouldReconcileStripeOrder,
} from "@/lib/stripeReconciliation"
import {
  createOrRecoverStripeCheckoutSession,
  type StoredPaymentCheckoutOrder,
} from "@/lib/paymentProviderCheckout"
import {
  isPaymentControlEnabled,
  isPaymentMethodEnabled,
} from "@/lib/paymentMethods"
import {
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
} from "@/lib/paymentProviders"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const ReconcileSchema = z.union([
  z.object({ orderId: z.string().min(1) }).strict(),
  z.object({ scope: z.literal("bulk") }).strict(),
])

const MAX_BULK_RECONCILIATION = 50

type StoredOrder = StripeCancelableOrder &
  StoredPaymentCheckoutOrder & {
    totalPriceFinal?: number | null
    stripePaymentIntentId?: string | null
    paidAt?: string | null
    paymentUpdatedAt?: string | null
    paymentReconciledAt?: string | null
  }

type ReconcileResult = {
  orderId: string
  checkoutState: "PAID" | "EXPIRED" | "OPEN" | "FINALIZING"
  checkoutAction: "PAID" | "EXPIRED" | "NONE"
  refundStatus: StripeRefundStatus | null
  outcome: "UPDATED" | "UNCHANGED" | "MANUAL_REVIEW" | "FAILED"
  error?: string
}

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent
  return session.payment_intent?.id ?? null
}

function getRefundPaymentIntentId(refund: Stripe.Refund) {
  const value = (
    refund as Stripe.Refund & {
      payment_intent?: string | { id?: string } | null
    }
  ).payment_intent

  if (typeof value === "string") return value
  return value?.id ?? null
}

function getRefundStatus(value: unknown): StripeRefundStatus {
  const status = String(value ?? "")
  if (
    status === "pending" ||
    status === "requires_action" ||
    status === "succeeded" ||
    status === "failed" ||
    status === "canceled"
  ) {
    return status
  }
  throw new Error("STRIPE_REFUND_UNKNOWN_STATUS")
}

function isStripeRmaRefundIntent(order: StoredOrder) {
  return (
    order.returnStatus === "RECEIVED" ||
    order.returnStatus === "REFUND_PENDING"
  )
}

function stripeRefundRecoveryKey(order: StoredOrder) {
  return isStripeRmaRefundIntent(order)
    ? `onics-order-return-refund:${order.id}:initial`
    : `onics-order-refund:${order.id}`
}

function refundMatchesOrder(
  order: StoredOrder,
  refund: Stripe.Refund,
  paymentIntentId: string
) {
  const orderId = refund.metadata?.order_id || null
  if (orderId && orderId !== order.id) return false

  return verifyStripeRefund(
    {
      id: order.id,
      totalPriceFinal: Number(order.totalPriceFinal ?? 0),
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
      stripePaymentIntentId: paymentIntentId,
      paymentStatus: order.paymentStatus,
    },
    {
      orderId,
      refundId: refund.id,
      paymentIntentId: getRefundPaymentIntentId(refund),
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
    }
  ).ok
}

function selectRecoverableRefund(
  order: StoredOrder,
  refunds: Stripe.Refund[],
  paymentIntentId: string
) {
  const matching = refunds.filter((refund) =>
    refundMatchesOrder(order, refund, paymentIntentId)
  )

  if (matching.length <= 1) return matching[0] ?? null

  const succeeded = matching.filter(
    (refund) => refund.status === "succeeded"
  )
  if (succeeded.length === 1) return succeeded[0]

  throw new Error("STRIPE_REFUND_RECOVERY_AMBIGUOUS")
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  let parsed: ReturnType<typeof ReconcileSchema.safeParse>
  try {
    parsed = ReconcileSchema.safeParse(await readCommerceJson(req))
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Żądanie synchronizacji Stripe jest zbyt duże." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe żądanie synchronizacji Stripe." },
        { status: 400 }
      )
    }
    throw error
  }

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie synchronizacji Stripe." },
      { status: 400 }
    )
  }

  const orderId = "orderId" in parsed.data ? orderId : undefined

  let stripeConfig: ReturnType<typeof resolveStripeCheckoutConfig>
  try {
    stripeConfig = resolveStripeCheckoutConfig({ requestUrl: req.url })
  } catch {
    return NextResponse.json(
      { error: "Stripe nie jest skonfigurowany." },
      { status: 503 }
    )
  }

  const snapshot = initializeMockData()
  const allOrders = snapshot.orders as StoredOrder[]

  let selected: StoredOrder[]
  if (orderId) {
    const order = allOrders.find(
      (candidate) => candidate.id === orderId
    )
    if (!order) {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }
    const provider = resolveOrderPaymentProvider(order)
    if (
      provider !== "STRIPE" ||
      !supportsPaymentProviderCapability(provider, "reconcile")
    ) {
      return NextResponse.json(
        { error: "Zamówienie nie jest powiązane z Stripe." },
        { status: 409 }
      )
    }
    selected = [order]
  } else {
    selected = allOrders
      .filter(
        (order) =>
          resolveOrderPaymentProvider(order) === "STRIPE" &&
          supportsPaymentProviderCapability("STRIPE", "reconcile") &&
          shouldReconcileStripeOrder(order)
      )
      .slice(0, MAX_BULK_RECONCILIATION)
  }

  const stripe = new Stripe(stripeConfig.stripeSecretKey)
  const results: ReconcileResult[] = []

  for (const snapshotOrder of selected) {
    try {
      let session: Stripe.Checkout.Session
      let registrationRecovered = false

      if (!snapshotOrder.stripeCheckoutSessionId) {
        const freshSettings = initializeMockData()
        if (!isPaymentControlEnabled(freshSettings.paymentControl)) {
          throw new Error("PAYMENTS_DISABLED")
        }
        if (
          !isPaymentMethodEnabled(
            freshSettings.paymentMethods,
            "STRIPE"
          )
        ) {
          throw new Error("PAYMENT_METHOD_DISABLED")
        }
        if (
          snapshotOrder.paymentStatus !== "PENDING" ||
          snapshotOrder.inventoryReservationStatus !== "RESERVED" ||
          (snapshotOrder.paymentCheckoutRegistrationStatus !== "PENDING" &&
            snapshotOrder.paymentCheckoutRegistrationStatus !== "UNCERTAIN")
        ) {
          throw new Error("STRIPE_CHECKOUT_REGISTRATION_NOT_RECOVERABLE")
        }

        session = await createOrRecoverStripeCheckoutSession(
          stripe,
          snapshotOrder,
          stripeConfig.appUrl
        )

        const registrationVerification = verifyCheckoutPayment(
          {
            id: snapshotOrder.id,
            totalPriceFinal: Number(snapshotOrder.totalPriceFinal ?? 0),
            stripeCheckoutSessionId: null,
            paymentStatus: snapshotOrder.paymentStatus,
          },
          {
            orderId: session.metadata?.order_id || null,
            sessionId: session.id,
            amountTotal: session.amount_total,
            currency: session.currency,
            paymentStatus: session.payment_status,
          }
        )
        if (!registrationVerification.ok) {
          throw new Error(registrationVerification.reason)
        }

        await mutateMockData((db) => {
          const order = (db.orders as StoredOrder[]).find(
            (candidate) => candidate.id === snapshotOrder.id
          )
          if (!order) throw new Error("ORDER_NOT_FOUND")
          if (
            order.stripeCheckoutSessionId &&
            order.stripeCheckoutSessionId !== session.id
          ) {
            throw new Error("PAYMENT_CHECKOUT_PROVIDER_REPLAY_MISMATCH")
          }
          if (
            order.paymentStatus !== "PENDING" ||
            order.inventoryReservationStatus !== "RESERVED"
          ) {
            throw new Error("STRIPE_CHECKOUT_REGISTRATION_STATE_CHANGED")
          }

          order.stripeCheckoutSessionId = session.id
          order.paymentCheckoutRegistrationStatus = "READY"
        })
        registrationRecovered = true
      } else {
        session = await stripe.checkout.sessions.retrieve(
          snapshotOrder.stripeCheckoutSessionId
        )
      }

      const checkoutState =
        classifyStripeCheckoutForReconciliation(session)

      let checkoutAction: ReconcileResult["checkoutAction"] = "NONE"
      let refundStatus: StripeRefundStatus | null = null
      let updated = registrationRecovered
      let manualReview = checkoutState === "FINALIZING"

      if (checkoutState === "PAID") {
        await mutateMockData((db) => {
          const order = (db.orders as StoredOrder[]).find(
            (candidate) => candidate.id === snapshotOrder.id
          )
          if (!order) throw new Error("ORDER_NOT_FOUND")
          if (order.stripeCheckoutSessionId !== session.id) {
            throw new Error("STRIPE_ORDER_CHANGED")
          }

          const verification = verifyCheckoutPayment(
            {
              id: order.id,
              totalPriceFinal: Number(order.totalPriceFinal ?? 0),
              stripeCheckoutSessionId: order.stripeCheckoutSessionId,
              paymentStatus: order.paymentStatus,
            },
            {
              orderId: session.metadata?.order_id || null,
              sessionId: session.id,
              amountTotal: session.amount_total,
              currency: session.currency,
              paymentStatus: session.payment_status,
            }
          )

          if (!verification.ok) {
            throw new Error(verification.reason)
          }

          const nextStatus = nextPaymentStatus(
            order.paymentStatus,
            "PAID"
          )

          applyStripeInventoryTransition(
            db.products as InventoryProduct[],
            order,
            nextStatus,
            "PAID"
          )

          order.paymentStatus = nextStatus
          order.stripePaymentIntentId =
            getPaymentIntentId(session) ||
            order.stripePaymentIntentId ||
            null
          order.paymentUpdatedAt = new Date().toISOString()
          order.paymentReconciledAt = order.paymentUpdatedAt
          if (nextStatus === "PAID" && !order.paidAt) {
            order.paidAt = order.paymentUpdatedAt
          }
        })
        checkoutAction = "PAID"
        updated = true
      } else if (checkoutState === "EXPIRED") {
        await mutateMockData((db) => {
          const order = (db.orders as StoredOrder[]).find(
            (candidate) => candidate.id === snapshotOrder.id
          )
          if (!order) throw new Error("ORDER_NOT_FOUND")
          if (order.stripeCheckoutSessionId !== session.id) {
            throw new Error("STRIPE_ORDER_CHANGED")
          }

          applyExpiredCheckoutCancellation(
            db.products as InventoryProduct[],
            order
          )
          order.paymentReconciledAt = new Date().toISOString()
        })
        checkoutAction = "EXPIRED"
        updated = true
      }

      const currentSnapshot = initializeMockData()
      const currentOrder = (
        currentSnapshot.orders as StoredOrder[]
      ).find((order) => order.id === snapshotOrder.id)

      let refund: Stripe.Refund | null = null

      if (currentOrder?.stripeRefundId) {
        refund = await stripe.refunds.retrieve(
          currentOrder.stripeRefundId
        )
      } else if (
        currentOrder?.refundRequestedAt &&
        currentOrder.paymentStatus === "PAID"
      ) {
        const intentId =
          currentOrder.stripePaymentIntentId ||
          getPaymentIntentId(session)
        if (!intentId) {
          throw new Error("STRIPE_REFUND_PAYMENT_INTENT_MISSING")
        }

        const listed = await stripe.refunds.list({
          payment_intent: intentId,
          limit: 10,
        })
        refund = selectRecoverableRefund(
          currentOrder,
          listed.data,
          intentId
        )

        if (!refund) {
          const rma = isStripeRmaRefundIntent(currentOrder)
          refund = await stripe.refunds.create(
            {
              payment_intent: intentId,
              reason: "requested_by_customer",
              metadata: {
                order_id: currentOrder.id,
                ...(rma ? { flow: "rma" } : {}),
              },
            },
            {
              idempotencyKey: stripeRefundRecoveryKey(currentOrder),
            }
          )
        }
      }

      if (currentOrder && refund) {
        refundStatus = getRefundStatus(refund.status)

        await mutateMockData((db) => {
          const order = (db.orders as StoredOrder[]).find(
            (candidate) => candidate.id === snapshotOrder.id
          )
          if (!order) throw new Error("ORDER_NOT_FOUND")
          if (
            order.stripeRefundId &&
            order.stripeRefundId !== refund.id
          ) {
            throw new Error("STRIPE_REFUND_ID_MISMATCH")
          }

          applyStripeRefundSnapshot(
            db.products as InventoryProduct[],
            order,
            {
              orderId:
                refund.metadata?.order_id || String(order.id),
              refundId: refund.id,
              paymentIntentId:
                getRefundPaymentIntentId(refund) ||
                order.stripePaymentIntentId ||
                null,
              amount: refund.amount,
              currency: refund.currency,
              status: refundStatus as StripeRefundStatus,
            }
          )
          order.paymentReconciledAt = new Date().toISOString()
        })
        updated = true
      }

      results.push({
        orderId: snapshotOrder.id,
        checkoutState,
        checkoutAction,
        refundStatus,
        outcome: manualReview
          ? "MANUAL_REVIEW"
          : updated
            ? "UPDATED"
            : "UNCHANGED",
      })
    } catch (error) {
      console.error(
        `Stripe reconciliation failed for order ${snapshotOrder.id}:`,
        error
      )
      results.push({
        orderId: snapshotOrder.id,
        checkoutState: "OPEN",
        checkoutAction: "NONE",
        refundStatus: null,
        outcome: "FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Nieznany błąd synchronizacji.",
      })
    }
  }

  const summary = results.reduce(
    (acc, result) => {
      acc[result.outcome] += 1
      return acc
    },
    {
      UPDATED: 0,
      UNCHANGED: 0,
      MANUAL_REVIEW: 0,
      FAILED: 0,
    } satisfies Record<ReconcileResult["outcome"], number>
  )

  const totalCandidates = orderId
    ? selected.length
    : allOrders.filter(
        (order) =>
          resolveOrderPaymentProvider(order) === "STRIPE" &&
          supportsPaymentProviderCapability("STRIPE", "reconcile") &&
          shouldReconcileStripeOrder(order)
      ).length

  const operationOutcome =
    results.length > 0 && summary.FAILED === results.length
      ? ("FAILED" as const)
      : summary.FAILED > 0 || summary.MANUAL_REVIEW > 0
        ? ("PARTIAL" as const)
        : ("SUCCESS" as const)

  try {
    await mutateMockData((db) => {
      db.paymentOperationEvents.unshift({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        provider: "STRIPE",
        operation: "RECONCILE",
        outcome: operationOutcome,
        processed: results.length,
        failed: summary.FAILED,
        manualReview: summary.MANUAL_REVIEW,
      })
      if (db.paymentOperationEvents.length > 100) {
        db.paymentOperationEvents.splice(100)
      }
    })
  } catch (operationLogError) {
    console.error(
      "Nie udało się utrwalić metadanych operacji reconcile:",
      operationLogError
    )
  }

  return NextResponse.json(
    {
      success: summary.FAILED === 0,
      scanned: selected.length,
      totalCandidates,
      truncated:
        !orderId &&
        totalCandidates > MAX_BULK_RECONCILIATION,
      summary,
      results,
    },
    {
      status:
        summary.FAILED > 0 || summary.MANUAL_REVIEW > 0
          ? 207
          : 200,
    }
  )
}
