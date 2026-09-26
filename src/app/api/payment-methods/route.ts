import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  describePaymentMethods,
  stripeOperationalStatus,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import {
  initializeMockData,
  mutateMockData,
  type PaymentMethodSettings,
} from "@/store/serverStore"

const UpdatePaymentMethodSchema = z.object({
  id: z.enum(["STRIPE"]),
  enabled: z.boolean(),
})

export async function GET() {
  const authCheck = await authorizeAPI([])
  if (!authCheck.authorized) return authCheck.response

  const snapshot = initializeMockData()
  return NextResponse.json({
    methods: describePaymentMethods(snapshot.paymentMethods),
  })
}

export async function PUT(req: Request) {
  const authCheck = await authorizeAPI(["ADMIN"])
  if (!authCheck.authorized) return authCheck.response

  const parsed = UpdatePaymentMethodSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowe ustawienie płatności." },
      { status: 400 }
    )
  }

  const method = parsed.data.id as PaymentMethodId
  if (method === "STRIPE" && parsed.data.enabled) {
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
      enabled: parsed.data.enabled,
      updatedAt: new Date().toISOString(),
    }
    return paymentMethods
  })

  return NextResponse.json({
    methods: describePaymentMethods(settings),
  })
}
