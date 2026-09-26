import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  describePaymentControl,
  describePaymentMethods,
  stripeOperationalStatus,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import {
  initializeMockData,
  mutateMockData,
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
    const control = await mutateMockData((db) => {
      const paymentControl = db.paymentControl as PaymentControlSettings
      paymentControl.enabled = globalUpdate.enabled
      paymentControl.maintenanceMessage =
        globalUpdate.maintenanceMessage?.trim() || null
      paymentControl.updatedAt = new Date().toISOString()
      return paymentControl
    })

    const snapshot = initializeMockData()
    return NextResponse.json({
      control: describePaymentControl(control),
      methods: describePaymentMethods(snapshot.paymentMethods),
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

  const settings = await mutateMockData((db) => {
    const paymentMethods = db.paymentMethods as PaymentMethodSettings
    paymentMethods[method] = {
      ...paymentMethods[method],
      enabled: methodUpdate.enabled,
      updatedAt: new Date().toISOString(),
    }
    return paymentMethods
  })

  const snapshot = initializeMockData()
  return NextResponse.json({
    control: describePaymentControl(snapshot.paymentControl),
    methods: describePaymentMethods(settings),
  })
}
