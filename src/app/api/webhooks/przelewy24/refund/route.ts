import { NextResponse } from "next/server"
import { z } from "zod"
import {
  assertPaymentProviderCapability,
  resolveOrderPaymentProvider,
} from "@/lib/paymentProviders"
import {
  applyPrzelewy24RefundNotification,
  resolvePrzelewy24Config,
  validatePrzelewy24RefundNotificationForOrder,
  verifyPrzelewy24RefundNotificationSignature,
  type Przelewy24RefundNotification,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  PaymentWebhookBodyTooLargeError,
  readPaymentWebhookJson,
} from "@/lib/paymentWebhookIngress"
import {
  hasProcessedPaymentWebhookEvent,
  recordProcessedPaymentWebhookEvent,
} from "@/lib/paymentWebhookLedger"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const RefundNotificationSchema = z.object({
  orderId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  sessionId: z.string().min(1).max(100),
  merchantId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  requestId: z.string().min(1).max(45),
  refundsUuid: z.string().min(1).max(35),
  amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().length(3),
  timestamp: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  status: z.union([z.literal(0), z.literal(1)]),
  sign: z.string().regex(/^[0-9a-f]{96}$/i),
})

export async function POST(req: Request) {
  try {
    assertPaymentProviderCapability("PRZELEWY24", "refund")
  } catch {
    return NextResponse.json(
      { error: "Refund Przelewy24 jest wyłączony przez kontrakt providera." },
      { status: 503 }
    )
  }

  let payload: unknown
  try {
    payload = await readPaymentWebhookJson(req)
  } catch (error) {
    if (error instanceof PaymentWebhookBodyTooLargeError) {
      return NextResponse.json(
        { error: "Powiadomienie refundu Przelewy24 jest zbyt duże." },
        { status: 413 }
      )
    }
    return NextResponse.json(
      { error: "Nieprawidłowe powiadomienie refundu Przelewy24." },
      { status: 400 }
    )
  }

  const parsed = RefundNotificationSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe powiadomienie refundu Przelewy24." },
      { status: 400 }
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

  const notification = parsed.data as Przelewy24RefundNotification
  const eventIdentity = {
    provider: "PRZELEWY24" as const,
    kind: "REFUND" as const,
    externalId: notification.sign,
  }

  if (!verifyPrzelewy24RefundNotificationSignature(notification, config)) {
    return NextResponse.json(
      { error: "Nieprawidłowy podpis refundu Przelewy24." },
      { status: 400 }
    )
  }

  const snapshot = initializeMockData()
  const order = (snapshot.orders as Przelewy24StoredOrder[]).find(
    (candidate) =>
      candidate.p24OrderId === notification.orderId ||
      candidate.p24SessionId === notification.sessionId
  )

  if (!order || resolveOrderPaymentProvider(order) !== "PRZELEWY24") {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia Przelewy24." },
      { status: 404 }
    )
  }

  try {
    validatePrzelewy24RefundNotificationForOrder(order, notification)
  } catch (error) {
    console.error("Przelewy24 refund notification/order mismatch:", error)
    return NextResponse.json(
      { error: "Powiadomienie refundu nie pasuje do zamówienia." },
      { status: 409 }
    )
  }

  try {
    const result = await mutateMockData((db) => {
      if (
        hasProcessedPaymentWebhookEvent(
          db.paymentWebhookEvents,
          eventIdentity
        )
      ) {
        const existing = (db.orders as Przelewy24StoredOrder[]).find(
          (candidate) => candidate.id === order.id
        )
        const outcome =
          existing?.refundStatus === "succeeded"
            ? ("completed" as const)
            : existing?.refundStatus === "failed"
              ? ("failed" as const)
              : ("unchanged" as const)

        return {
          outcome,
          paymentStatus: existing?.paymentStatus ?? null,
          refundStatus: existing?.refundStatus ?? null,
          returnStatus: existing?.returnStatus ?? null,
          ledgerDuplicate: true,
        }
      }

      const fresh = (db.orders as Przelewy24StoredOrder[]).find(
        (candidate) => candidate.id === order.id
      )
      if (!fresh) throw new Error("ORDER_NOT_FOUND")
      if (resolveOrderPaymentProvider(fresh) !== "PRZELEWY24") {
        throw new Error("PRZELEWY24_REQUIRED")
      }

      const outcome = applyPrzelewy24RefundNotification(
        db.products as InventoryProduct[],
        fresh,
        notification
      )

      recordProcessedPaymentWebhookEvent(
        db.paymentWebhookEvents,
        eventIdentity
      )

      return {
        outcome,
        paymentStatus: fresh.paymentStatus,
        refundStatus: fresh.refundStatus,
        returnStatus: fresh.returnStatus,
        ledgerDuplicate: false,
      }
    })

    return NextResponse.json({
      received: true,
      duplicate: result.ledgerDuplicate,
      success: result.outcome === "completed",
      outcome: result.outcome,
      paymentStatus: result.paymentStatus,
      refundStatus: result.refundStatus,
      returnStatus: result.returnStatus,
    })
  } catch (error) {
    console.error("Przelewy24 refund settlement failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się rozliczyć refundu Przelewy24.",
      },
      { status: 409 }
    )
  }
}
