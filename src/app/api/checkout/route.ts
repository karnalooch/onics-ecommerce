import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import {
  createPaymentCheckout,
  type PaymentCheckoutSessionUser,
} from "@/lib/paymentProviderCheckout"
import {
  PAYMENT_PROVIDER_IDS,
  getPaymentProviderDefinition,
} from "@/lib/paymentProviders"
import {
  isPaymentControlEnabled,
  isPaymentMethodEnabled,
  type PaymentMethodId,
} from "@/lib/paymentMethods"
import { initializeMockData } from "@/store/serverStore"

const CartSchema = z.object({
  paymentMethod: z.enum(PAYMENT_PROVIDER_IDS).default("STRIPE"),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10000),
      })
    )
    .min(1)
    .max(250),
})

function providerDisabledMessage(
  method: PaymentMethodId,
  maintenanceMessage?: string | null
) {
  return (
    maintenanceMessage ||
    getPaymentProviderDefinition(method).disabledMessage
  )
}

function paymentErrorResponse(
  error: unknown,
  method: PaymentMethodId,
  maintenanceMessage?: string | null
) {
  const code = error instanceof Error ? error.message : ""
  const inventoryConflict =
    code === "INVENTORY_NOT_AVAILABLE" ||
    code === "INVENTORY_PRODUCT_NOT_FOUND" ||
    /Brak wymaganej ilości produktu/.test(code)
  const paymentUnavailable =
    code === "PAYMENTS_DISABLED" ||
    code === "PAYMENT_METHOD_DISABLED" ||
    code === "PAYMENT_PROVIDER_NOT_CONFIGURED"

  const message =
    code === "CHECKOUT_STATE_CHANGED"
      ? "Koszyk zmienił się podczas tworzenia płatności. Odśwież ceny i spróbuj ponownie."
      : code === "PAYMENTS_DISABLED"
        ? "Płatności online zostały wyłączone przez administratora."
        : code === "PAYMENT_METHOD_DISABLED"
          ? providerDisabledMessage(method, maintenanceMessage)
          : code === "PAYMENT_PROVIDER_NOT_CONFIGURED"
            ? getPaymentProviderDefinition(method).misconfiguredMessage
            : inventoryConflict
              ? "Stan magazynowy zmienił się podczas tworzenia płatności. Odśwież koszyk i spróbuj ponownie."
              : error instanceof Error
                ? error.message
                : "Błąd serwera."

  console.error("Błąd generowania checkoutu:", error)
  return NextResponse.json(
    { error: message },
    {
      status: paymentUnavailable
        ? 503
        : inventoryConflict
          ? 409
          : 500,
    }
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([])
  if (!authCheck.authorized) return authCheck.response

  const parsed = CartSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Nieprawidłowy koszyk." },
      { status: 400 }
    )
  }

  const method = parsed.data.paymentMethod
  const snapshot = initializeMockData()
  const methodSettings = snapshot.paymentMethods[method]

  if (!isPaymentControlEnabled(snapshot.paymentControl)) {
    return NextResponse.json(
      {
        error:
          snapshot.paymentControl.maintenanceMessage ||
          "Płatności online są obecnie wyłączone przez administratora.",
      },
      { status: 503 }
    )
  }

  if (!isPaymentMethodEnabled(snapshot.paymentMethods, method)) {
    return NextResponse.json(
      {
        error: providerDisabledMessage(
          method,
          methodSettings.maintenanceMessage
        ),
      },
      { status: 503 }
    )
  }

  try {
    const result = await createPaymentCheckout({
      method,
      requestUrl: req.url,
      sessionUser: authCheck.user as PaymentCheckoutSessionUser,
      items: parsed.data.items,
      snapshot,
    })

    return NextResponse.json(result)
  } catch (error) {
    return paymentErrorResponse(
      error,
      method,
      methodSettings.maintenanceMessage
    )
  }
}
