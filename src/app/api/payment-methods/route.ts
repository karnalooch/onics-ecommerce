import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { appendPaymentAudit } from "@/lib/paymentAudit"
import {
  describePaymentControl,
  describePaymentMethods,
  paymentMethodOperationalStatus,
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
  z
    .object({
      scope: z.literal("METHOD").optional(),
      id: z.enum(["STRIPE", "BANK_TRANSFER"]),
      enabled: z.boolean().optional(),
      displayName: z.string().trim().min(1).max(80).optional(),
      displayOrder: z.coerce.number().int().min(0).max(999).optional(),
      maintenanceMessage: z.string().trim().max(160).nullable().optional(),
    })
    .refine(
      (value) =>
        value.enabled !== undefined ||
        value.displayName !== undefined ||
        value.displayOrder !== undefined ||
        value.maintenanceMessage !== undefined,
      { message: "Brak ustawień metody płatności do zapisania." }
    ),
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
      {
        error:
          parsed.error.issues[0]?.message ||
          "Nieprawidłowe ustawienie płatności.",
      },
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

  if (methodUpdate.enabled === true) {
    const status = paymentMethodOperationalStatus(method)
    if (!status.configured) {
      return NextResponse.json(
        {
          error:
            method === "STRIPE"
              ? "Nie można włączyć Stripe: konfiguracja serwerowa płatności lub webhooka jest niekompletna."
              : "Nie można włączyć przelewu bankowego: odbiorca lub numer rachunku nie są poprawnie skonfigurowane.",
        },
        { status: 409 }
      )
    }
  }

  const result = await mutateMockData((db) => {
    const paymentMethods = db.paymentMethods as PaymentMethodSettings
    const paymentAudit = db.paymentAudit as PaymentAuditEntry[]
    const previous = paymentMethods[method]
    const next = {
      ...previous,
      enabled: methodUpdate.enabled ?? previous.enabled,
      displayName:
        methodUpdate.displayName?.trim() || previous.displayName,
      displayOrder:
        methodUpdate.displayOrder ?? previous.displayOrder,
      maintenanceMessage:
        methodUpdate.maintenanceMessage === undefined
          ? previous.maintenanceMessage
          : methodUpdate.maintenanceMessage?.trim() || null,
    }

    const auditEntry = appendPaymentAudit(
      paymentAudit,
      authCheck.user,
      {
        target: method,
        previousEnabled: previous.enabled,
        nextEnabled: next.enabled,
        previousMaintenanceMessage: previous.maintenanceMessage,
        nextMaintenanceMessage: next.maintenanceMessage,
        previousDisplayName: previous.displayName,
        nextDisplayName: next.displayName,
        previousDisplayOrder: previous.displayOrder,
        nextDisplayOrder: next.displayOrder,
      }
    )

    paymentMethods[method] = {
      ...next,
      updatedAt: auditEntry?.createdAt ?? previous.updatedAt,
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
