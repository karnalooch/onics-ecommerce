import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  nextPaymentStatus,
  verifyCheckoutPayment,
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
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const ReconcileSchema = z.object({
  orderId: z.string().min(1).optional(),
})

const MAX_BULK_RECONCILIATION = 50

type StoredOrder = StripeCancelableOrder & {
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

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = ReconcileSchema.safeParse(
    await req.json().catch(() => ({}))
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie synchronizacji Stripe." },
      { status: 400 }
    )
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe nie jest skonfigurowany." },
      { status: 503 }
    )
  }

  const snapshot = initializeMockData()
  const allOrders = snapshot.orders as StoredOrder[]

  let selected: StoredOrder[]
  if (parsed.data.orderId) {
    const order = allOrders.find(
      (candidate) => candidate.id === parsed.data.orderId
    )
    if (!order) {
      return NextResponse.json(
        { error: "Nie znaleziono zamówienia." },
        { status: 404 }
      )
    }
    if (!order.stripeCheckoutSessionId) {
      return NextResponse.json(
        { error: "Zamówienie nie jest powiązane z Stripe." },
        { status: 409 }
      )
    }
    selected = [order]
  } else {
    selected = allOrders
      .filter(shouldReconcileStripeOrder)
      .slice(0, MAX_BULK_RECONCILIATION)
  }

  const stripe = new Stripe(stripeSecretKey)
  const results: ReconcileResult[] = []

  for (const snapshotOrder of selected) {
    const sessionId = snapshotOrder.stripeCheckoutSessionId
    if (!sessionId) continue

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const checkoutState =
        classifyStripeCheckoutForReconciliation(session)

      let checkoutAction: ReconcileResult["checkoutAction"] = "NONE"
      let refundStatus: StripeRefundStatus | null = null
      let updated = false
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

      if (currentOrder?.stripeRefundId) {
        const refund = await stripe.refunds.retrieve(
          currentOrder.stripeRefundId
        )
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

  const totalCandidates = parsed.data.orderId
    ? selected.length
    : allOrders.filter(shouldReconcileStripeOrder).length

  return NextResponse.json(
    {
      success: summary.FAILED === 0,
      scanned: selected.length,
      totalCandidates,
      truncated:
        !parsed.data.orderId &&
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
