import { NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { appendPaymentAudit } from "@/lib/paymentAudit"
import {
  isEmergencyShutdownCandidate,
  type EmergencyShutdownResult,
} from "@/lib/paymentShutdown"
import {
  applyExpiredCheckoutCancellation,
  type StripeCancelableOrder,
} from "@/lib/refunds"
import type { InventoryProduct } from "@/lib/inventoryReservations"
import {
  initializeMockData,
  mutateMockData,
  type PaymentAuditEntry,
  type PaymentControlSettings,
} from "@/store/serverStore"

const EmergencyShutdownSchema = z.object({
  confirm: z.literal("EMERGENCY_SHUTDOWN"),
  maintenanceMessage: z.string().trim().max(160).nullable().optional(),
})

type ShutdownOrderResult = {
  orderId: string
  outcome: EmergencyShutdownResult
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = EmergencyShutdownSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Brak wymaganego potwierdzenia awaryjnego wyłączenia." },
      { status: 400 }
    )
  }

  const maintenanceMessage =
    parsed.data.maintenanceMessage?.trim() ||
    "Płatności online zostały tymczasowo wyłączone przez administratora."

  await mutateMockData((db) => {
    const paymentControl = db.paymentControl as PaymentControlSettings
    const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
    const previousEnabled = paymentControl.enabled
    const previousMaintenanceMessage =
      paymentControl.maintenanceMessage

    paymentControl.enabled = false
    paymentControl.maintenanceMessage = maintenanceMessage

    const auditEntry = appendPaymentAudit(
      paymentAudit,
      authCheck.user,
      {
        target: "GLOBAL",
        operation: "EMERGENCY_SHUTDOWN",
        previousEnabled,
        nextEnabled: false,
        previousMaintenanceMessage,
        nextMaintenanceMessage: maintenanceMessage,
      }
    )

    paymentControl.updatedAt =
      auditEntry?.createdAt ?? paymentControl.updatedAt
  })

  const snapshot = initializeMockData()
  const candidates = (
    snapshot.orders as StripeCancelableOrder[]
  ).filter(isEmergencyShutdownCandidate)

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        success: false,
        globalDisabled: true,
        candidates: candidates.length,
        processed: 0,
        error:
          "Nowe płatności zostały wyłączone, ale brak konfiguracji Stripe uniemożliwia wygaszenie otwartych sesji.",
      },
      { status: 503 }
    )
  }

  const stripe = new Stripe(stripeSecretKey)
  const results: ShutdownOrderResult[] = []

  for (const candidate of candidates) {
    const sessionId = candidate.stripeCheckoutSessionId
    if (!sessionId) continue

    try {
      let session = await stripe.checkout.sessions.retrieve(sessionId)

      if (
        candidate.paymentStatus === "PAID" ||
        session.payment_status === "paid"
      ) {
        results.push({
          orderId: candidate.id,
          outcome: "skipped-paid",
        })
        continue
      }

      if (session.status === "complete") {
        results.push({
          orderId: candidate.id,
          outcome: "skipped-finalizing",
        })
        continue
      }

      const wasAlreadyExpired = session.status === "expired"

      if (session.status === "open") {
        try {
          session = await stripe.checkout.sessions.expire(session.id)
        } catch (expireError) {
          const refreshed = await stripe.checkout.sessions.retrieve(
            session.id
          )
          if (refreshed.status !== "expired") {
            throw expireError
          }
          session = refreshed
        }
      }

      if (session.status !== "expired") {
        results.push({
          orderId: candidate.id,
          outcome: "failed",
        })
        continue
      }

      try {
        await mutateMockData((db) => {
          const fresh = (
            db.orders as StripeCancelableOrder[]
          ).find((order) => order.id === candidate.id)

          if (!fresh) throw new Error("ORDER_NOT_FOUND")
          if (fresh.stripeCheckoutSessionId !== sessionId) {
            throw new Error("STRIPE_ORDER_CHANGED")
          }
          if (
            fresh.paymentStatus === "PAID" ||
            fresh.paymentStatus === "REFUNDED" ||
            fresh.status === "SHIPPED" ||
            fresh.status === "RETURNED" ||
            fresh.inventoryReservationStatus === "FINALIZED"
          ) {
            throw new Error("SHUTDOWN_ORDER_FINALIZED")
          }

          applyExpiredCheckoutCancellation(
            db.products as InventoryProduct[],
            fresh
          )
        })

        results.push({
          orderId: candidate.id,
          outcome: wasAlreadyExpired
            ? "already-expired"
            : "cancelled",
        })
      } catch (stateError) {
        const code =
          stateError instanceof Error ? stateError.message : ""
        if (
          code === "SHUTDOWN_ORDER_FINALIZED" ||
          code === "STRIPE_CANCEL_PAYMENT_ALREADY_FINAL" ||
          code === "STRIPE_ORDER_CHANGED"
        ) {
          results.push({
            orderId: candidate.id,
            outcome: "changed",
          })
          continue
        }
        throw stateError
      }
    } catch (error) {
      console.error(
        `Emergency Stripe shutdown failed for order ${candidate.id}:`,
        error
      )
      results.push({
        orderId: candidate.id,
        outcome: "failed",
      })
    }
  }

  const counts = results.reduce(
    (acc, result) => {
      acc[result.outcome] += 1
      return acc
    },
    {
      cancelled: 0,
      "already-expired": 0,
      "skipped-paid": 0,
      "skipped-finalizing": 0,
      changed: 0,
      failed: 0,
    } satisfies Record<EmergencyShutdownResult, number>
  )

  const unresolved =
    counts["skipped-finalizing"] + counts.changed + counts.failed

  return NextResponse.json(
    {
      success: unresolved === 0,
      globalDisabled: true,
      candidates: candidates.length,
      processed: results.length,
      counts,
      results,
    },
    { status: unresolved === 0 ? 200 : 207 }
  )
}
