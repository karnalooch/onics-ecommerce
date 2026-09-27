import {
  CHECKOUT_PAYMENT_METHOD_KIND,
  type CheckoutPaymentMethodId,
} from "@/lib/checkoutPaymentDiscoveryContract"

export type CheckoutManualField = {
  label: string
  value: string
  monospace?: boolean
}

export type ValidatedCheckoutResponse = {
  clientRequestId: string
  orderId: string
  paymentMethod: CheckoutPaymentMethodId
  nextAction:
    | {
        type: "REDIRECT"
        url: string
      }
    | {
        type: "MANUAL"
        title: string
        fields: CheckoutManualField[]
        amount?: number
        currency?: string
        note?: string
      }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Provider płatności zwrócił nieprawidłowe pole ${label}.`)
  }
  return value as Record<string, unknown>
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Provider płatności zwrócił nieprawidłowe pole ${label}.`)
  }
  return value.trim()
}

function parseHttpsRedirect(value: unknown) {
  const raw = requireText(value, "redirect URL")
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("Provider płatności zwrócił nieprawidłowy adres przekierowania.")
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Provider płatności zwrócił niedozwolony adres przekierowania.")
  }

  return parsed.toString()
}

function parseOptionalMoney(value: unknown) {
  if (value === undefined) return undefined
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error("Provider płatności zwrócił nieprawidłową kwotę.")
  }

  const cents = Math.round((value + Number.EPSILON) * 100)
  if (
    !Number.isSafeInteger(cents) ||
    Math.abs(value - cents / 100) > 1e-9
  ) {
    throw new Error("Provider płatności zwrócił nieprawidłową kwotę.")
  }

  return cents / 100
}

function parseOptionalCurrency(value: unknown) {
  if (value === undefined) return undefined
  const currency = requireText(value, "waluty").toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Provider płatności zwrócił nieprawidłową walutę.")
  }
  return currency
}

function parseOptionalNote(value: unknown) {
  if (value === undefined) return undefined
  return requireText(value, "notatki")
}

function parseManualFields(value: unknown): CheckoutManualField[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    throw new Error("Provider płatności zwrócił nieprawidłową instrukcję przelewu.")
  }

  return value.map((candidate) => {
    const field = requireRecord(candidate, "instrukcji przelewu")
    if (
      field.monospace !== undefined &&
      typeof field.monospace !== "boolean"
    ) {
      throw new Error("Provider płatności zwrócił nieprawidłową instrukcję przelewu.")
    }

    return {
      label: requireText(field.label, "etykiety instrukcji"),
      value: requireText(field.value, "wartości instrukcji"),
      ...(field.monospace === undefined
        ? {}
        : { monospace: field.monospace }),
    }
  })
}

export function validateCheckoutPaymentResponse(
  requestedMethod: CheckoutPaymentMethodId,
  response: unknown
): ValidatedCheckoutResponse {
  const root = requireRecord(response, "odpowiedzi")
  const clientRequestId = requireText(root.clientRequestId, "clientRequestId")
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      clientRequestId
    )
  ) {
    throw new Error("Provider płatności zwrócił nieprawidłowy clientRequestId.")
  }
  const orderId = requireText(root.orderId, "orderId")

  if (root.paymentMethod !== requestedMethod) {
    throw new Error("Provider płatności zwrócił inną metodę niż uruchomiona.")
  }

  const nextAction = requireRecord(root.nextAction, "nextAction")
  const expectedKind = CHECKOUT_PAYMENT_METHOD_KIND[requestedMethod]
  if (nextAction.type !== expectedKind) {
    throw new Error("Provider płatności zwrócił nieprawidłowy typ akcji.")
  }

  if (nextAction.type === "REDIRECT") {
    return {
      clientRequestId,
      orderId,
      paymentMethod: requestedMethod,
      nextAction: {
        type: "REDIRECT",
        url: parseHttpsRedirect(nextAction.url),
      },
    }
  }

  const amount = parseOptionalMoney(nextAction.amount)
  const currency = parseOptionalCurrency(nextAction.currency)
  if ((amount === undefined) !== (currency === undefined)) {
    throw new Error("Provider płatności zwrócił niepełne dane kwoty.")
  }

  return {
    clientRequestId,
    orderId,
    paymentMethod: requestedMethod,
    nextAction: {
      type: "MANUAL",
      title: requireText(nextAction.title, "tytułu instrukcji"),
      fields: parseManualFields(nextAction.fields),
      ...(amount === undefined ? {} : { amount }),
      ...(currency === undefined ? {} : { currency }),
      ...(nextAction.note === undefined
        ? {}
        : { note: parseOptionalNote(nextAction.note) }),
    },
  }
}
