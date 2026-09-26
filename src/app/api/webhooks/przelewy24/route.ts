import { NextResponse } from "next/server"
import { z } from "zod"
import {
  assertPaymentProviderCapability,
  resolveOrderPaymentProvider,
} from "@/lib/paymentProviders"
import {
  applyVerifiedPrzelewy24Payment,
  resolvePrzelewy24Config,
  stagePrzelewy24Verification,
  validatePrzelewy24NotificationForOrder,
  verifyPrzelewy24NotificationSignature,
  verifyPrzelewy24Transaction,
  type Przelewy24Notification,
  type Przelewy24StoredOrder,
} from "@/lib/przelewy24"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import { initializeMockData, mutateMockData } from "@/store/serverStore"

const NotificationSchema = z.object({
  merchantId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  posId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  sessionId: z.string().min(1).max(100),
  amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  originAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().length(3),
  orderId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  methodId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  statement: z.string(),
  sign: z.string().regex(/^[0-9a-f]{96}$/i),
})

export async function POST(req: Request) {
  try {
    assertPaymentProviderCapability("PRZELEWY24", "webhook")
  } catch {
    return NextResponse.json(
      { error: "Webhook Przelewy24 jest wyłączony przez kontrakt providera." },
      { status: 503 }
    )
  }

  const parsed = NotificationSchema.safeParse(
    await req.json().catch(() => null)
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nieprawidłowe powiadomienie Przelewy24." },
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

  const notification = parsed.data as Przelewy24Notification

  if (!verifyPrzelewy24NotificationSignature(notification, config)) {
    return NextResponse.json(
      { error: "Nieprawidłowy podpis powiadomienia Przelewy24." },
      { status: 400 }
    )
  }

  const snapshot = initializeMockData()
  const order = (snapshot.orders as Przelewy24StoredOrder[]).find(
    (candidate) =>
      candidate.p24SessionId === notification.sessionId ||
      candidate.id === notification.sessionId
  )

  if (!order || resolveOrderPaymentProvider(order) !== "PRZELEWY24") {
    return NextResponse.json(
      { error: "Nie znaleziono zamówienia Przelewy24." },
      { status: 404 }
    )
  }

  try {
    validatePrzelewy24NotificationForOrder(order, notification)
  } catch (error) {
    console.error("Przelewy24 notification/order mismatch:", error)
    return NextResponse.json(
      { error: "Powiadomienie nie pasuje do zamówienia." },
      { status: 409 }
    )
  }

  try {
    await mutateMockData((db) => {
      const fresh = (db.orders as Przelewy24StoredOrder[]).find(
        (candidate) =>
          candidate.p24SessionId === notification.sessionId ||
          candidate.id === notification.sessionId
      )
      if (!fresh) throw new Error("ORDER_NOT_FOUND")
      if (resolveOrderPaymentProvider(fresh) !== "PRZELEWY24") {
        throw new Error("PRZELEWY24_ORDER_MISMATCH")
      }

      stagePrzelewy24Verification(fresh, notification)
    })
  } catch (error) {
    console.error("Przelewy24 verification intent persistence failed:", error)
    return NextResponse.json(
      { error: "Nie udało się bezpiecznie zapisać powiadomienia Przelewy24." },
      { status: 409 }
    )
  }

  try {
    await verifyPrzelewy24Transaction(config, notification)
  } catch (error) {
    console.error("Przelewy24 transaction verify failed:", error)
    return NextResponse.json(
      { error: "Nie udało się zweryfikować transakcji Przelewy24." },
      { status: 502 }
    )
  }

  try {
    const result = await mutateMockData((db) => {
      const fresh = (db.orders as Przelewy24StoredOrder[]).find(
        (candidate) =>
          candidate.p24SessionId === notification.sessionId ||
          candidate.id === notification.sessionId
      )
      if (!fresh) throw new Error("ORDER_NOT_FOUND")
      if (resolveOrderPaymentProvider(fresh) !== "PRZELEWY24") {
        throw new Error("PRZELEWY24_ORDER_MISMATCH")
      }

      const outcome = applyVerifiedPrzelewy24Payment(
        db.products as InventoryProduct[],
        fresh,
        notification
      )

      return {
        outcome,
        paymentStatus: fresh.paymentStatus,
        p24OrderId: fresh.p24OrderId ?? null,
      }
    })

    return NextResponse.json({
      received: true,
      duplicate: result.outcome === "unchanged",
      paymentStatus: result.paymentStatus,
      orderId: result.p24OrderId,
    })
  } catch (error) {
    console.error("Przelewy24 local settlement failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać płatności Przelewy24.",
      },
      { status: 409 }
    )
  }
}
