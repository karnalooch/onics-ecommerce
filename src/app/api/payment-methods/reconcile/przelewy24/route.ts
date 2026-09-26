import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  applyReconciledPrzelewy24Payment,
  applyVerifiedPrzelewy24Payment,
  getPrzelewy24RefundDetails,
  getPrzelewy24TransactionBySessionId,
  requestPrzelewy24Refund,
  resolvePrzelewy24Config,
  verifyPrzelewy24Transaction,
  verifyPrzelewy24TransactionIdentity,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
import { shouldReconcilePrzelewy24Order } from "@/lib/przelewy24Reconciliation"
import {
  resolveOrderPaymentProvider,
  supportsPaymentProviderCapability,
} from "@/lib/paymentProviders"
import { moneyToMinorUnits } from "@/lib/payments"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const ReconcileSchema = z.object({
  orderId: z.string().min(1).optional(),
})

const MAX_BULK_RECONCILIATION = 50

type ReconcileResult = {
  orderId: string
  paymentAction: "PAID" | "NONE"
  refundAction: "REISSUED" | "FOUND" | "NONE"
  outcome: "UPDATED" | "UNCHANGED" | "MANUAL_REVIEW" | "FAILED"
  error?: string
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = ReconcileSchema.safeParse(
    await req.json().catch(() => ({}))
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe żądanie synchronizacji Przelewy24." },
      { status: 400 }
    )
  }

  if (!supportsPaymentProviderCapability("PRZELEWY24", "reconcile")) {
    return NextResponse.json(
      { error: "Przelewy24 nie obsługuje synchronizacji." },
      { status: 409 }
    )
  }

  let config: ReturnType<typeof resolvePrzelewy24Config>
  try {
    config = resolvePrzelewy24Config()
  } catch {
    return NextResponse.json(
      { error: "Przelewy24 nie jest skonfigurowane." },
      { status: 503 }
    )
  }

  const snapshot = initializeMockData()
  const allOrders = snapshot.orders as Przelewy24StoredOrder[]

  let selected: Przelewy24StoredOrder[]
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
    if (
      resolveOrderPaymentProvider(order) !== "PRZELEWY24" ||
      !order.p24SessionId
    ) {
      return NextResponse.json(
        { error: "Zamówienie nie jest powiązane z Przelewy24." },
        { status: 409 }
      )
    }
    selected = [order]
  } else {
    selected = allOrders
      .filter(
        (order) =>
          resolveOrderPaymentProvider(order) === "PRZELEWY24" &&
          shouldReconcilePrzelewy24Order(order)
      )
      .slice(0, MAX_BULK_RECONCILIATION)
  }

  const results: ReconcileResult[] = []

  for (const snapshotOrder of selected) {
    let paymentAction: ReconcileResult["paymentAction"] = "NONE"
    let refundAction: ReconcileResult["refundAction"] = "NONE"
    let updated = false
    let manualReview = false

    try {
      const paymentUnresolved =
        snapshotOrder.paymentStatus !== "PAID" &&
        snapshotOrder.paymentStatus !== "REFUNDED" &&
        snapshotOrder.paymentStatus !== "EXPIRED"

      if (paymentUnresolved || snapshotOrder.p24VerificationPending) {
        if (snapshotOrder.p24VerificationPending) {
          const staged = snapshotOrder.p24VerificationPending
          await verifyPrzelewy24Transaction(config, staged)

          await mutateMockData((db) => {
            const order = (db.orders as Przelewy24StoredOrder[]).find(
              (candidate) => candidate.id === snapshotOrder.id
            )
            if (!order) throw new Error("ORDER_NOT_FOUND")

            applyVerifiedPrzelewy24Payment(
              db.products as InventoryProduct[],
              order,
              staged
            )
          })
          paymentAction = "PAID"
          updated = true
        } else if (snapshotOrder.p24SessionId) {
          const transaction = await getPrzelewy24TransactionBySessionId(
            config,
            snapshotOrder.p24SessionId
          )

          if (transaction) {
            await verifyPrzelewy24TransactionIdentity(config, transaction)

            await mutateMockData((db) => {
              const order = (db.orders as Przelewy24StoredOrder[]).find(
                (candidate) => candidate.id === snapshotOrder.id
              )
              if (!order) throw new Error("ORDER_NOT_FOUND")

              applyReconciledPrzelewy24Payment(
                db.products as InventoryProduct[],
                order,
                transaction
              )
            })
            paymentAction = "PAID"
            updated = true
          }
        }
      }

      const currentSnapshot = initializeMockData()
      const currentOrder = (
        currentSnapshot.orders as Przelewy24StoredOrder[]
      ).find((candidate) => candidate.id === snapshotOrder.id)

      if (
        currentOrder?.refundStatus === "pending" &&
        currentOrder.p24OrderId &&
        currentOrder.p24SessionId &&
        currentOrder.p24RefundRequestId &&
        currentOrder.p24RefundsUuid
      ) {
        const details = await getPrzelewy24RefundDetails(
          config,
          currentOrder.p24OrderId
        )

        if (!details) {
          await requestPrzelewy24Refund(config, {
            orderId: currentOrder.p24OrderId,
            sessionId: currentOrder.p24SessionId,
            amount: moneyToMinorUnits(
              Number(currentOrder.totalPriceFinal ?? 0)
            ),
            requestId: currentOrder.p24RefundRequestId,
            refundsUuid: currentOrder.p24RefundsUuid,
            description: "Zwrot zamowienia ONICS",
          })
          refundAction = "REISSUED"
          updated = true
        } else {
          if (
            details.orderId !== currentOrder.p24OrderId ||
            details.sessionId !== currentOrder.p24SessionId ||
            details.currency !== "PLN"
          ) {
            throw new Error("PRZELEWY24_REFUND_DETAILS_MISMATCH")
          }

          const expectedAmount = moneyToMinorUnits(
            Number(currentOrder.totalPriceFinal ?? 0)
          )
          const matching = details.refunds.find(
            (refund) =>
              refund.requestId === currentOrder.p24RefundRequestId &&
              refund.amount === expectedAmount
          )

          refundAction = "FOUND"
          manualReview = true

          if (!matching && details.refunds.length === 0) {
            throw new Error("PRZELEWY24_REFUND_DETAILS_EMPTY")
          }

          await mutateMockData((db) => {
            const order = (db.orders as Przelewy24StoredOrder[]).find(
              (candidate) => candidate.id === snapshotOrder.id
            )
            if (!order) throw new Error("ORDER_NOT_FOUND")
            order.paymentReconciledAt = new Date().toISOString()
          })
        }
      } else if (updated) {
        await mutateMockData((db) => {
          const order = (db.orders as Przelewy24StoredOrder[]).find(
            (candidate) => candidate.id === snapshotOrder.id
          )
          if (!order) throw new Error("ORDER_NOT_FOUND")
          order.paymentReconciledAt = new Date().toISOString()
        })
      }

      results.push({
        orderId: snapshotOrder.id,
        paymentAction,
        refundAction,
        outcome: manualReview
          ? "MANUAL_REVIEW"
          : updated
            ? "UPDATED"
            : "UNCHANGED",
      })
    } catch (error) {
      console.error(
        `Przelewy24 reconciliation failed for order ${snapshotOrder.id}:`,
        error
      )
      results.push({
        orderId: snapshotOrder.id,
        paymentAction,
        refundAction,
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
    : allOrders.filter(
        (order) =>
          resolveOrderPaymentProvider(order) === "PRZELEWY24" &&
          shouldReconcilePrzelewy24Order(order)
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
        provider: "PRZELEWY24",
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
      "Nie udało się utrwalić metadanych reconcile Przelewy24:",
      operationLogError
    )
  }

  return NextResponse.json(
    {
      success: summary.FAILED === 0 && summary.MANUAL_REVIEW === 0,
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
