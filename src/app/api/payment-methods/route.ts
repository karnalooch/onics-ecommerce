import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { appendPaymentAudit } from "@/lib/paymentAudit"
import {
  describePaymentControl,
  describePaymentMethods,
  stripeOperationalStatus,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import {
  initializeMockData,
  mutateMockData,
  type PaymentAuditEntry,
  type PaymentControlSettings,
  type PaymentMethodSettings,
} from "@/store/serverStore"

const UpdatePaymentSettingsSchema = z.union([
  z.object({
    scope: z.literal("GLOBAL"),
    enabled: z.boolean(),
    maintenanceMessage: z.string().trim().max(160).nullable().optional(),
  }),
  z.object({
    scope: z.literal("METHOD").optional(),
    id: z.enum(["STRIPE"]),
    enabled: z.boolean(),
  }),
])

export async function GET() {
  const authCheck = await authorizeAPI([])
  if (!authCheck.authorized) return authCheck.response

  const snapshot = initializeMockData()
  return NextResponse.json({
    control: describePaymentControl(snapshot.paymentControl),
    methods: describePaymentMethods(snapshot.paymentMethods),
    ...(authCheck.currentRole === "ADMIN"
      ? { audit: snapshot.paymentAudit.slice(0, 20) }
      : {}),
  })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = UpdatePaymentSettingsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe ustawienie płatności." },
      { status: 400 }
    )
  }

  if (parsed.data.scope === "GLOBAL") {
    const globalUpdate = parsed.data
    const result = await mutateMockData((db) => {
      const paymentControl = db.paymentControl as PaymentControlSettings
      const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
      const nextMaintenanceMessage =
        globalUpdate.maintenanceMessage?.trim() || null
      const previousEnabled = paymentControl.enabled
      const previousMaintenanceMessage =
        paymentControl.maintenanceMessage

      paymentControl.enabled = globalUpdate.enabled
      paymentControl.maintenanceMessage = nextMaintenanceMessage

      const auditEntry = appendPaymentAudit(
        paymentAudit,
        authCheck.user,
        {
          target: "GLOBAL",
          previousEnabled,
          nextEnabled: globalUpdate.enabled,
          previousMaintenanceMessage,
          nextMaintenanceMessage,
        }
      )

      if (auditEntry) {
        paymentControl.updatedAt = auditEntry.createdAt
      }

      return { paymentControl, auditEntry }
    })

    const snapshot = initializeMockData()
    return NextResponse.json({
      control: describePaymentControl(result.paymentControl),
      methods: describePaymentMethods(snapshot.paymentMethods),
      audit: snapshot.paymentAudit.slice(0, 20),
    })
  }

  const methodUpdate = parsed.data
  const method = methodUpdate.id as PaymentMethodId
  if (method === "STRIPE" && methodUpdate.enabled) {
    const status = stripeOperationalStatus()
    if (!status.configured) {
      return NextResponse.json(
        {
          error:
            "Nie można włączyć Stripe: konfiguracja serwerowa płatności lub webhooka jest niekompletna.",
        },
        { status: 409 }
      )
    }
  }

  const result = await mutateMockData((db) => {
    const paymentMethods = db.paymentMethods as PaymentMethodSettings
    const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
    const previousEnabled = paymentMethods[method].enabled

    const auditEntry = appendPaymentAudit(
      paymentAudit,
      authCheck.user,
      {
        target: method,
        previousEnabled,
        nextEnabled: methodUpdate.enabled,
      }
    )

    paymentMethods[method] = {
      ...paymentMethods[method],
      enabled: methodUpdate.enabled,
      updatedAt:
        auditEntry?.createdAt ?? paymentMethods[method].updatedAt,
    }

    return { paymentMethods, auditEntry }
  })

  const snapshot = initializeMockData()
  return NextResponse.json({
    control: describePaymentControl(snapshot.paymentControl),
    methods: describePaymentMethods(result.paymentMethods),
    audit: snapshot.paymentAudit.slice(0, 20),
  })
}
