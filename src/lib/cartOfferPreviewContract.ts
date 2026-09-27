import type { CartOfferPreview } from "@/lib/cartOffer"
import { isValidCartItemQuantity } from "@/lib/cartQuantity"

export type CartOfferPreviewRequestItem = {
  id: string
  quantity: number
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} oferty.`)
  }
  return value as Record<string, unknown>
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} oferty.`)
  }
  return value.trim()
}

function requireNullableText(value: unknown, label: string) {
  if (value === null) return null
  return requireText(value, label)
}

function requireMoneyCents(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Serwer zwrócił nieprawidłową wartość ${label} oferty.`)
  }

  const cents = Math.round((value + Number.EPSILON) * 100)
  if (
    !Number.isSafeInteger(cents) ||
    Math.abs(value - cents / 100) > 1e-9
  ) {
    throw new Error(`Serwer zwrócił nieprawidłową wartość ${label} oferty.`)
  }

  return cents
}

function parseOfferItem(
  value: unknown,
  expectedQuantityById: Map<string, number>
) {
  const item = requireRecord(value, "pozycji")
  const id = requireText(item.id, "id produktu")
  const expectedQuantity = expectedQuantityById.get(id)

  if (expectedQuantity === undefined) {
    throw new Error("Serwer zwrócił nieoczekiwany produkt w ofercie.")
  }

  const quantity = item.quantity
  if (
    typeof quantity !== "number" ||
    !isValidCartItemQuantity(quantity)
  ) {
    throw new Error("Serwer zwrócił nieprawidłową ilość produktu w ofercie.")
  }
  if (quantity !== expectedQuantity) {
    throw new Error(
      "Serwer zwrócił inną ilość produktu niż wysłana do przygotowania oferty."
    )
  }

  const unitPriceNetCents = requireMoneyCents(
    item.unitPriceNet,
    "ceny jednostkowej netto"
  )
  if (unitPriceNetCents <= 0) {
    throw new Error("Serwer zwrócił nieaktywną cenę produktu w ofercie.")
  }

  const lineTotalNetCents = requireMoneyCents(
    item.lineTotalNet,
    "wartości pozycji netto"
  )
  const expectedLineTotalCents = unitPriceNetCents * quantity
  if (
    !Number.isSafeInteger(expectedLineTotalCents) ||
    lineTotalNetCents !== expectedLineTotalCents
  ) {
    throw new Error("Serwer zwrócił niespójną wartość pozycji oferty.")
  }

  return {
    id,
    sku: requireText(item.sku, "sku"),
    name: requireText(item.name, "nazwy produktu"),
    quantity,
    unitPriceNet: unitPriceNetCents / 100,
    lineTotalNet: lineTotalNetCents / 100,
    lineTotalNetCents,
  }
}

export function validateCartOfferPreview(
  requestedItems: CartOfferPreviewRequestItem[],
  response: unknown
): CartOfferPreview {
  const expectedQuantityById = new Map<string, number>()
  for (const item of requestedItems) {
    const id = typeof item.id === "string" ? item.id.trim() : ""
    if (
      !id ||
      !isValidCartItemQuantity(item.quantity) ||
      expectedQuantityById.has(id)
    ) {
      throw new Error("Koszyk zawiera nieprawidłowy zestaw pozycji oferty.")
    }
    expectedQuantityById.set(id, item.quantity)
  }

  const root = requireRecord(response, "podglądu")
  const reference = requireText(root.reference, "numeru")
  const issuedAt = requireText(root.issuedAt, "daty")
  if (Number.isNaN(Date.parse(issuedAt))) {
    throw new Error("Serwer zwrócił nieprawidłową datę oferty.")
  }
  if (root.currency !== "PLN") {
    throw new Error("Serwer zwrócił nieprawidłową walutę oferty.")
  }

  const customer = requireRecord(root.customer, "odbiorcy")
  const responseItems = root.items
  if (!Array.isArray(responseItems)) {
    throw new Error("Serwer zwrócił nieprawidłowe pozycje oferty.")
  }
  if (responseItems.length !== requestedItems.length) {
    throw new Error("Serwer zwrócił niepełny zestaw pozycji oferty.")
  }

  const itemsById = new Map<string, ReturnType<typeof parseOfferItem>>()
  let calculatedTotalCents = 0

  for (const value of responseItems) {
    const item = parseOfferItem(value, expectedQuantityById)
    if (itemsById.has(item.id)) {
      throw new Error("Serwer zwrócił zduplikowany produkt w ofercie.")
    }

    calculatedTotalCents += item.lineTotalNetCents
    if (!Number.isSafeInteger(calculatedTotalCents)) {
      throw new Error("Serwer zwrócił zbyt dużą wartość oferty.")
    }
    itemsById.set(item.id, item)
  }

  const totalNetCents = requireMoneyCents(root.totalNet, "sumy netto")
  if (totalNetCents !== calculatedTotalCents) {
    throw new Error("Serwer zwrócił niespójną sumę netto oferty.")
  }

  const items = requestedItems.map((requestedItem) => {
    const item = itemsById.get(requestedItem.id.trim())
    if (!item) {
      throw new Error("Serwer nie zwrócił wszystkich pozycji oferty.")
    }
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      lineTotalNet: item.lineTotalNet,
    }
  })

  return {
    reference,
    issuedAt,
    currency: "PLN",
    customer: {
      companyName: requireNullableText(customer.companyName, "nazwy odbiorcy"),
      nip: requireNullableText(customer.nip, "NIP odbiorcy"),
      email: requireNullableText(customer.email, "e-maila odbiorcy"),
    },
    items,
    totalNet: totalNetCents / 100,
  }
}
