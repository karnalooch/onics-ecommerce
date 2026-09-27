import {
  ORDER_IMPORT_FORMAT,
  ORDER_IMPORT_MAX_ITEMS,
  type OrderImportPreview,
  type ParsedOrderImport,
} from "@/lib/orderImport"
import { isValidCartItemQuantity } from "@/lib/cartQuantity"

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} importu.`)
  }
  return value as Record<string, unknown>
}

function requireText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Serwer zwrócił nieprawidłowe pole ${label} importu.`)
  }
  return value.trim()
}

function requirePositiveSafeInteger(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new Error(`Serwer zwrócił nieprawidłową wartość ${label} importu.`)
  }
  return value
}

function requireNonNegativeSafeInteger(value: unknown, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(`Serwer zwrócił nieprawidłową wartość ${label} importu.`)
  }
  return value
}

function requirePositiveMoney(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("Serwer zwrócił nieprawidłową cenę pozycji importu.")
  }

  const cents = Math.round((value + Number.EPSILON) * 100)
  if (
    !Number.isSafeInteger(cents) ||
    Math.abs(value - cents / 100) > 1e-9
  ) {
    throw new Error("Serwer zwrócił nieprawidłową cenę pozycji importu.")
  }

  return cents / 100
}

function requireExactSourceLines(
  value: unknown,
  expected: number[],
  sku: string
) {
  if (!Array.isArray(value)) {
    throw new Error(`Serwer zwrócił nieprawidłowe linie źródłowe dla SKU ${sku}.`)
  }

  const lines = value.map((line) =>
    requirePositiveSafeInteger(line, "linii źródłowej")
  )

  if (
    lines.length !== expected.length ||
    lines.some((line, index) => line !== expected[index])
  ) {
    throw new Error(`Serwer zwrócił inne linie źródłowe dla SKU ${sku}.`)
  }

  return lines
}

function buildExpectedGroups(parsed: ParsedOrderImport) {
  if (
    parsed.format !== ORDER_IMPORT_FORMAT ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.items) ||
    parsed.items.length < 1 ||
    parsed.items.length > ORDER_IMPORT_MAX_ITEMS
  ) {
    throw new Error("Lokalny kontrakt importu XML jest nieprawidłowy.")
  }

  const groups = new Map<
    string,
    { quantity: number; sourceLines: number[] }
  >()

  for (const item of parsed.items) {
    const sku = typeof item.sku === "string" ? item.sku.trim() : ""
    if (
      !sku ||
      typeof item.quantity !== "number" ||
      !isValidCartItemQuantity(item.quantity) ||
      typeof item.line !== "number" ||
      !Number.isSafeInteger(item.line) ||
      item.line < 1
    ) {
      throw new Error("Lokalny kontrakt importu XML jest nieprawidłowy.")
    }

    const current = groups.get(sku) ?? { quantity: 0, sourceLines: [] }
    const quantity = current.quantity + item.quantity
    if (!Number.isSafeInteger(quantity)) {
      throw new Error("Lokalny kontrakt importu XML jest nieprawidłowy.")
    }

    current.quantity = quantity
    current.sourceLines.push(item.line)
    groups.set(sku, current)
  }

  return groups
}

export function validateOrderImportPreview(
  parsed: ParsedOrderImport,
  response: unknown
): OrderImportPreview {
  const expectedBySku = buildExpectedGroups(parsed)
  const root = requireRecord(response, "podglądu")

  if (root.format !== ORDER_IMPORT_FORMAT || root.version !== 1) {
    throw new Error("Serwer zwrócił nieprawidłowy format importu.")
  }

  if (!Array.isArray(root.accepted) || !Array.isArray(root.rejected)) {
    throw new Error("Serwer zwrócił nieprawidłową listę pozycji importu.")
  }

  const seenSkus = new Set<string>()
  const acceptedIds = new Set<string>()
  const accepted: OrderImportPreview["accepted"] = []
  const rejected: OrderImportPreview["rejected"] = []

  for (const value of root.accepted) {
    const item = requireRecord(value, "zaakceptowanej pozycji")
    const sku = requireText(item.sku, "SKU")
    const expected = expectedBySku.get(sku)

    if (!expected) {
      throw new Error("Serwer zwrócił nieoczekiwane SKU w imporcie.")
    }
    if (seenSkus.has(sku)) {
      throw new Error("Serwer zwrócił zduplikowane SKU w imporcie.")
    }

    const id = requireText(item.id, "id produktu")
    if (acceptedIds.has(id)) {
      throw new Error("Serwer zwrócił zduplikowany produkt w imporcie.")
    }

    const quantity = item.quantity
    if (
      typeof quantity !== "number" ||
      !isValidCartItemQuantity(quantity) ||
      quantity !== expected.quantity
    ) {
      throw new Error(`Serwer zwrócił inną ilość dla SKU ${sku}.`)
    }

    const sourceLines = requireExactSourceLines(
      item.sourceLines,
      expected.sourceLines,
      sku
    )

    seenSkus.add(sku)
    acceptedIds.add(id)
    accepted.push({
      id,
      sku,
      name: requireText(item.name, "nazwy produktu"),
      price: requirePositiveMoney(item.price),
      quantity,
      sourceLines,
    })
  }

  for (const value of root.rejected) {
    const item = requireRecord(value, "odrzuconej pozycji")
    const sku = requireText(item.sku, "SKU")
    const expected = expectedBySku.get(sku)

    if (!expected) {
      throw new Error("Serwer zwrócił nieoczekiwane SKU w imporcie.")
    }
    if (seenSkus.has(sku)) {
      throw new Error("Serwer zwrócił zduplikowane SKU w imporcie.")
    }

    const quantity = requirePositiveSafeInteger(item.quantity, "ilości")
    if (quantity !== expected.quantity) {
      throw new Error(`Serwer zwrócił inną ilość dla SKU ${sku}.`)
    }

    const sourceLines = requireExactSourceLines(
      item.sourceLines,
      expected.sourceLines,
      sku
    )

    seenSkus.add(sku)
    rejected.push({
      sku,
      quantity,
      sourceLines,
      reason: requireText(item.reason, "powodu odrzucenia"),
    })
  }

  if (seenSkus.size !== expectedBySku.size) {
    throw new Error("Serwer zwrócił niepełny zestaw pozycji importu.")
  }

  accepted.sort((a, b) => a.sourceLines[0] - b.sourceLines[0])
  rejected.sort((a, b) => a.sourceLines[0] - b.sourceLines[0])

  const summary = requireRecord(root.summary, "podsumowania")
  const expectedSummary = {
    sourceLines: parsed.items.length,
    acceptedLines: accepted.reduce(
      (sum, item) => sum + item.sourceLines.length,
      0
    ),
    rejectedLines: rejected.reduce(
      (sum, item) => sum + item.sourceLines.length,
      0
    ),
    acceptedQuantity: accepted.reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
    rejectedQuantity: rejected.reduce(
      (sum, item) => sum + item.quantity,
      0
    ),
  }

  const validatedSummary = {
    sourceLines: requireNonNegativeSafeInteger(
      summary.sourceLines,
      "liczby linii źródłowych"
    ),
    acceptedLines: requireNonNegativeSafeInteger(
      summary.acceptedLines,
      "liczby zaakceptowanych linii"
    ),
    rejectedLines: requireNonNegativeSafeInteger(
      summary.rejectedLines,
      "liczby odrzuconych linii"
    ),
    acceptedQuantity: requireNonNegativeSafeInteger(
      summary.acceptedQuantity,
      "zaakceptowanej ilości"
    ),
    rejectedQuantity: requireNonNegativeSafeInteger(
      summary.rejectedQuantity,
      "odrzuconej ilości"
    ),
  }

  for (const key of Object.keys(expectedSummary) as Array<
    keyof typeof expectedSummary
  >) {
    if (validatedSummary[key] !== expectedSummary[key]) {
      throw new Error("Serwer zwrócił niespójne podsumowanie importu.")
    }
  }

  return {
    format: ORDER_IMPORT_FORMAT,
    version: 1,
    accepted,
    rejected,
    summary: validatedSummary,
  }
}
