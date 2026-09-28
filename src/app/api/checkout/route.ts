import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizeAPI } from "@/lib/authUtils"
import { COMMERCE_TRANSACTION_ROLES } from "@/lib/commerceAccess"
import { CART_ITEM_QUANTITY_MAX } from "@/lib/cartQuantity"
import {
  CommerceBodyInvalidError,
  CommerceBodyTooLargeError,
  readCommerceJson,
} from "@/lib/commerceIngress"
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
  requestId: z.string().uuid(),
  paymentMethod: z.enum(PAYMENT_PROVIDER_IDS).default("STRIPE"),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(CART_ITEM_QUANTITY_MAX),
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
  const checkoutForbidden = code === "CHECKOUT_ROLE_NOT_ALLOWED"
  const registrationUncertain =
    code === "PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN"
  const availabilityChanged =
    code === "PAYMENT_CHECKOUT_AVAILABILITY_CHANGED"
  const idempotencyConflict = code === "PAYMENT_CHECKOUT_IDEMPOTENCY_KEY_REUSED"
  const checkoutConflict =
    code === "CHECKOUT_STATE_CHANGED" ||
    inventoryConflict ||
    idempotencyConflict

  const message =
    code === "CHECKOUT_ROLE_NOT_ALLOWED"
      ? "Checkout online jest dostępny dla aktywnych kont B2B."
      : code === "PAYMENT_CHECKOUT_REGISTRATION_UNCERTAIN"
        ? "Nie można bezpiecznie ponowić tej rejestracji płatności. Zamówienie zostało zachowane do weryfikacji, aby uniknąć podwójnego obciążenia."
      : code === "PAYMENT_CHECKOUT_AVAILABILITY_CHANGED"
        ? "Dostępność płatności zmieniła się podczas tworzenia checkoutu. Nowy redirect nie został udostępniony."
      : code === "PAYMENT_CHECKOUT_IDEMPOTENCY_KEY_REUSED"
        ? "Identyfikator żądania płatności został już użyty dla innego checkoutu. Odśwież koszyk i spróbuj ponownie."
      : code === "CHECKOUT_STATE_CHANGED"
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
      status: checkoutForbidden
        ? 403
        : paymentUnavailable || registrationUncertain || availabilityChanged
          ? 503
          : checkoutConflict
            ? 409
            : 500,
    }
  )
}

export async function POST(req: Request) {
  const authCheck = await authorizeAPI([...COMMERCE_TRANSACTION_ROLES])
  if (!authCheck.authorized) return authCheck.response

  let body: unknown
  try {
    body = await readCommerceJson(req)
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) {
      return NextResponse.json(
        { error: "Koszyk jest zbyt duży." },
        { status: 413 }
      )
    }
    if (error instanceof CommerceBodyInvalidError) {
      return NextResponse.json(
        { error: "Nieprawidłowe body koszyka." },
        { status: 400 }
      )
    }
    throw error
  }

  const parsed = CartSchema.safeParse(body)
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
      requestId: parsed.data.requestId,
      method,
      requestUrl: req.url,
      sessionUser: authCheck.user as PaymentCheckoutSessionUser,
      items: parsed.data.items,
      snapshot,
    })

    return NextResponse.json({
      ...result,
      clientRequestId: parsed.data.requestId,
    })
  } catch (error) {
    return paymentErrorResponse(
      error,
      method,
      methodSettings.maintenanceMessage
    )
  }
}
