import {
  resolveCartItems,
  type CommerceProduct,
  type CommerceUser,
  type ResolvedCartItem,
} from "@/lib/commerce"

export const ORDER_IMPORT_FORMAT = "CELTRONICS_ORDER_XML_V1" as const
export const ORDER_IMPORT_MAX_BYTES = 256 * 1024
export const ORDER_IMPORT_MAX_ITEMS = 250

export type ParsedOrderImportItem = {
  line: number
  sku: string
  quantity: number
}

export type ParsedOrderImport = {
  format: typeof ORDER_IMPORT_FORMAT
  version: 1
  items: ParsedOrderImportItem[]
}

export type OrderImportAcceptedItem = ResolvedCartItem & {
  sourceLines: number[]
}

export type OrderImportRejectedItem = {
  sku: string
  quantity: number
  sourceLines: number[]
  reason: string
}

export type OrderImportPreview = {
  format: typeof ORDER_IMPORT_FORMAT
  version: 1
  accepted: OrderImportAcceptedItem[]
  rejected: OrderImportRejectedItem[]
  summary: {
    sourceLines: number
    acceptedLines: number
    rejectedLines: number
    acceptedQuantity: number
    rejectedQuantity: number
  }
}

export class OrderImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = "OrderImportError"
  }
}

function xmlByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function parseAttributes(source: string) {
  const attributes = new Map<string, string>()
  const attributePattern = /([A-Za-z][A-Za-z0-9-]*)\s*=\s*"([^"]*)"/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(source))) {
    if (source.slice(cursor, match.index).trim()) {
      throw new OrderImportError(
        "XML_INVALID_ATTRIBUTES",
        "Nieprawidłowe atrybuty w pliku XML."
      )
    }

    const [, name, value] = match
    if (attributes.has(name)) {
      throw new OrderImportError(
        "XML_DUPLICATE_ATTRIBUTE",
        `Powtórzony atrybut XML: ${name}.`
      )
    }

    attributes.set(name, value)
    cursor = attributePattern.lastIndex
  }

  if (source.slice(cursor).trim()) {
    throw new OrderImportError(
      "XML_INVALID_ATTRIBUTES",
      "Nieprawidłowe atrybuty w pliku XML."
    )
  }

  return attributes
}

function assertExactAttributes(
  attributes: Map<string, string>,
  expected: string[]
) {
  if (
    attributes.size !== expected.length ||
    expected.some((name) => !attributes.has(name))
  ) {
    throw new OrderImportError(
      "XML_UNSUPPORTED_ATTRIBUTES",
      "Plik XML zawiera nieobsługiwane lub brakujące atrybuty."
    )
  }
}

function lineNumberAt(source: string, index: number) {
  let line = 1
  for (let position = 0; position < index; position += 1) {
    if (source.charCodeAt(position) === 10) line += 1
  }
  return line
}

export function parseCeltronicsOrderXml(xml: string): ParsedOrderImport {
  const source = xml.replace(/^\uFEFF/, "")

  if (!source.trim()) {
    throw new OrderImportError("XML_EMPTY", "Plik XML jest pusty.")
  }

  const size = xmlByteLength(source)
  if (size > ORDER_IMPORT_MAX_BYTES) {
    throw new OrderImportError(
      "XML_TOO_LARGE",
      `Plik XML przekracza limit ${ORDER_IMPORT_MAX_BYTES / 1024} KiB.`,
      413
    )
  }

  // CELTRONICS_ORDER_XML_V1 is intentionally not a general-purpose XML/EDI
  // parser. Declarations other than the XML declaration, comments, DTD,
  // entities and CDATA are outside the contract and fail closed.
  if (/<!/i.test(source)) {
    throw new OrderImportError(
      "XML_FORBIDDEN_DECLARATION",
      "DTD, ENTITY, CDATA i komentarze XML nie są obsługiwane."
    )
  }

  const tokens: Array<{ value: string; index: number }> = []
  const tokenPattern = /<[^>]*>/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(source))) {
    if (source.slice(cursor, match.index).trim()) {
      throw new OrderImportError(
        "XML_TEXT_NOT_ALLOWED",
        "Tekst poza obsługiwanymi elementami XML nie jest dozwolony."
      )
    }
    tokens.push({ value: match[0], index: match.index })
    cursor = tokenPattern.lastIndex
  }

  if (source.slice(cursor).trim()) {
    throw new OrderImportError(
      "XML_TRAILING_CONTENT",
      "Plik XML zawiera nieobsługiwaną treść."
    )
  }

  if (tokens.length < 2) {
    throw new OrderImportError(
      "XML_INVALID_DOCUMENT",
      "Nieprawidłowa struktura dokumentu XML."
    )
  }

  let tokenIndex = 0
  if (tokens[0]?.value.startsWith("<?")) {
    if (
      !/^<\?xml\s+version="1\.0"(?:\s+encoding="UTF-8")?\s*\?>$/i.test(
        tokens[0].value
      )
    ) {
      throw new OrderImportError(
        "XML_INVALID_DECLARATION",
        "Obsługiwana jest wyłącznie deklaracja XML 1.0 z kodowaniem UTF-8."
      )
    }
    tokenIndex += 1
  }

  const root = tokens[tokenIndex]
  const rootMatch = root?.value.match(/^<celtronics-order\b([\s\S]*?)>$/)
  if (!rootMatch || root.value.endsWith("/>")) {
    throw new OrderImportError(
      "XML_INVALID_ROOT",
      "Oczekiwany element główny <celtronics-order version=\"1\">."
    )
  }

  const rootAttributes = parseAttributes(rootMatch[1])
  assertExactAttributes(rootAttributes, ["version"])
  if (rootAttributes.get("version") !== "1") {
    throw new OrderImportError(
      "XML_UNSUPPORTED_VERSION",
      "Nieobsługiwana wersja formatu zamówienia XML."
    )
  }
  tokenIndex += 1

  const items: ParsedOrderImportItem[] = []
  let closed = false

  for (; tokenIndex < tokens.length; tokenIndex += 1) {
    const token = tokens[tokenIndex]

    if (token.value === "</celtronics-order>") {
      if (tokenIndex !== tokens.length - 1) {
        throw new OrderImportError(
          "XML_TRAILING_ELEMENTS",
          "Po zamknięciu zamówienia nie mogą występować dodatkowe elementy."
        )
      }
      closed = true
      break
    }

    const itemMatch = token.value.match(/^<item\b([\s\S]*?)\/>$/)
    if (!itemMatch) {
      throw new OrderImportError(
        "XML_UNSUPPORTED_ELEMENT",
        `Nieobsługiwany element XML w linii ${lineNumberAt(source, token.index)}.`
      )
    }

    const attributes = parseAttributes(itemMatch[1])
    assertExactAttributes(attributes, ["sku", "quantity"])

    const sku = attributes.get("sku") ?? ""
    if (!/^[A-Za-z0-9][A-Za-z0-9._:+\/@#()-]{0,127}$/.test(sku)) {
      throw new OrderImportError(
        "XML_INVALID_SKU",
        `Nieprawidłowy SKU w linii ${lineNumberAt(source, token.index)}.`
      )
    }

    const quantityText = attributes.get("quantity") ?? ""
    if (!/^[1-9][0-9]{0,4}$/.test(quantityText)) {
      throw new OrderImportError(
        "XML_INVALID_QUANTITY",
        `Nieprawidłowa ilość w linii ${lineNumberAt(source, token.index)}.`
      )
    }

    const quantity = Number(quantityText)
    if (quantity > 10000) {
      throw new OrderImportError(
        "XML_INVALID_QUANTITY",
        `Ilość w linii ${lineNumberAt(source, token.index)} przekracza 10000.`
      )
    }

    items.push({
      line: lineNumberAt(source, token.index),
      sku,
      quantity,
    })

    if (items.length > ORDER_IMPORT_MAX_ITEMS) {
      throw new OrderImportError(
        "XML_TOO_MANY_ITEMS",
        `Plik XML może zawierać maksymalnie ${ORDER_IMPORT_MAX_ITEMS} pozycji.`,
        413
      )
    }
  }

  if (!closed) {
    throw new OrderImportError(
      "XML_ROOT_NOT_CLOSED",
      "Brak zamknięcia elementu <celtronics-order>."
    )
  }

  if (items.length === 0) {
    throw new OrderImportError(
      "XML_NO_ITEMS",
      "Plik XML nie zawiera żadnych pozycji zamówienia."
    )
  }

  return {
    format: ORDER_IMPORT_FORMAT,
    version: 1,
    items,
  }
}

export function buildOrderImportPreview(
  parsed: ParsedOrderImport,
  products: CommerceProduct[],
  user?: CommerceUser | null
): OrderImportPreview {
  const grouped = new Map<
    string,
    { quantity: number; sourceLines: number[] }
  >()

  for (const item of parsed.items) {
    const current = grouped.get(item.sku) ?? {
      quantity: 0,
      sourceLines: [],
    }
    current.quantity += item.quantity
    current.sourceLines.push(item.line)
    grouped.set(item.sku, current)
  }

  const productsBySku = new Map<string, CommerceProduct[]>()
  for (const product of products) {
    const sku = String(product.sku)
    const matches = productsBySku.get(sku) ?? []
    matches.push(product)
    productsBySku.set(sku, matches)
  }

  const accepted: OrderImportAcceptedItem[] = []
  const rejected: OrderImportRejectedItem[] = []

  for (const [sku, group] of grouped) {
    if (!Number.isSafeInteger(group.quantity) || group.quantity > 10000) {
      rejected.push({
        sku,
        quantity: group.quantity,
        sourceLines: group.sourceLines,
        reason: "Łączna ilość dla SKU przekracza dozwolony limit 10000.",
      })
      continue
    }

    const matchingProducts = productsBySku.get(sku) ?? []
    if (matchingProducts.length === 0) {
      rejected.push({
        sku,
        quantity: group.quantity,
        sourceLines: group.sourceLines,
        reason: "SKU nie istnieje w aktualnym katalogu.",
      })
      continue
    }

    if (matchingProducts.length > 1) {
      rejected.push({
        sku,
        quantity: group.quantity,
        sourceLines: group.sourceLines,
        reason: "SKU jest niejednoznaczny w aktualnym katalogu.",
      })
      continue
    }

    const product = matchingProducts[0]

    try {
      const resolved = resolveCartItems(
        [{ id: product.id, quantity: group.quantity }],
        products,
        user,
        { requirePriced: true, requireStock: true }
      )
      const item = resolved.items[0]

      accepted.push({
        ...item,
        sourceLines: group.sourceLines,
      })
    } catch (error) {
      rejected.push({
        sku,
        quantity: group.quantity,
        sourceLines: group.sourceLines,
        reason:
          error instanceof Error
            ? error.message
            : "Pozycja nie przeszła walidacji katalogu.",
      })
    }
  }

  accepted.sort((a, b) => a.sourceLines[0] - b.sourceLines[0])
  rejected.sort((a, b) => a.sourceLines[0] - b.sourceLines[0])

  return {
    format: ORDER_IMPORT_FORMAT,
    version: 1,
    accepted,
    rejected,
    summary: {
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
    },
  }
}
