export const CHECKOUT_PAYMENT_METHOD_IDS = [
  "STRIPE",
  "BANK_TRANSFER",
  "PRZELEWY24",
] as const

export type CheckoutPaymentMethodId =
  (typeof CHECKOUT_PAYMENT_METHOD_IDS)[number]

export type CheckoutPaymentMethod = {
  id: CheckoutPaymentMethodId
  name: string
  enabled: boolean
  configured: boolean
  available: boolean
  kind: "REDIRECT" | "MANUAL"
  maintenanceMessage: string | null
}

export type CheckoutPaymentDiscovery = {
  control: {
    enabled: boolean
    maintenanceMessage: string | null
  }
  methods: CheckoutPaymentMethod[]
}

export const CHECKOUT_PAYMENT_METHOD_KIND: Record<
  CheckoutPaymentMethodId,
  CheckoutPaymentMethod["kind"]
> = {
  STRIPE: "REDIRECT",
  BANK_TRANSFER: "MANUAL",
  PRZELEWY24: "REDIRECT",
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} metod płatności.`)
  }
  return value as Record<string, unknown>
}

function requireBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} metod płatności.`)
  }
  return value
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} metod płatności.`)
  }
  return value.trim()
}

function requireNullableText(value: unknown, label: string) {
  if (value === null) return null
  return requireText(value, label)
}

function isCheckoutPaymentMethodId(
  value: unknown
): value is CheckoutPaymentMethodId {
  return (
    typeof value === "string" &&
    (CHECKOUT_PAYMENT_METHOD_IDS as readonly string[]).includes(value)
  )
}

function parseMethod(value: unknown): CheckoutPaymentMethod {
  const method = requireRecord(value, "metody")
  if (!isCheckoutPaymentMethodId(method.id)) {
    throw new Error("Serwer zwrócił nieznaną metodę płatności.")
  }

  const id = method.id
  const enabled = requireBoolean(method.enabled, "enabled")
  const configured = requireBoolean(method.configured, "configured")
  const available = requireBoolean(method.available, "available")
  const kind = method.kind

  if (kind !== "REDIRECT" && kind !== "MANUAL") {
    throw new Error("Serwer zwrócił nieprawidłowy typ metody płatności.")
  }
  if (kind !== CHECKOUT_PAYMENT_METHOD_KIND[id]) {
    throw new Error("Serwer zwrócił niespójny typ metody płatności.")
  }
  if (available !== (enabled && configured)) {
    throw new Error("Serwer zwrócił niespójną dostępność metody płatności.")
  }

  return {
    id,
    name: requireText(method.name, "nazwy"),
    enabled,
    configured,
    available,
    kind,
    maintenanceMessage: requireNullableText(
      method.maintenanceMessage,
      "komunikatu serwisowego"
    ),
  }
}

export function validateCheckoutPaymentDiscovery(
  response: unknown
): CheckoutPaymentDiscovery {
  const root = requireRecord(response, "odpowiedzi")
  const control = requireRecord(root.control, "control")
  const methodsValue = root.methods

  if (!Array.isArray(methodsValue)) {
    throw new Error("Serwer zwrócił nieprawidłową listę metod płatności.")
  }
  if (methodsValue.length !== CHECKOUT_PAYMENT_METHOD_IDS.length) {
    throw new Error("Serwer zwrócił niepełny zestaw metod płatności.")
  }

  const seen = new Set<CheckoutPaymentMethodId>()
  const methods = methodsValue.map((value) => {
    const method = parseMethod(value)
    if (seen.has(method.id)) {
      throw new Error("Serwer zwrócił zduplikowaną metodę płatności.")
    }
    seen.add(method.id)
    return method
  })

  if (CHECKOUT_PAYMENT_METHOD_IDS.some((id) => !seen.has(id))) {
    throw new Error("Serwer nie zwrócił wszystkich metod płatności.")
  }

  return {
    control: {
      enabled: requireBoolean(control.enabled, "global enabled"),
      maintenanceMessage: requireNullableText(
        control.maintenanceMessage,
        "globalnego komunikatu serwisowego"
      ),
    },
    methods,
  }
}
