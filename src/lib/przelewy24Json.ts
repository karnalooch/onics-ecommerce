const P24_SIGNED_BIGINT_MAX = BigInt("9223372036854775807")
const BIGINT_ZERO = BigInt(0)

export type Przelewy24OrderId = string | number

export function normalizePrzelewy24OrderId(
  value: unknown
): string | null {
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  ) {
    return String(value)
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null
  }

  try {
    const parsed = BigInt(value)
    if (parsed <= BIGINT_ZERO || parsed > P24_SIGNED_BIGINT_MAX) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function przelewy24OrderIdsEqual(
  left: unknown,
  right: unknown
) {
  const normalizedLeft = normalizePrzelewy24OrderId(left)
  const normalizedRight = normalizePrzelewy24OrderId(right)
  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    normalizedLeft === normalizedRight
  )
}

function quoteIntegerField(
  raw: string,
  fieldName: string
) {
  let cursor = 0
  let index = 0
  let output = ""

  while (index < raw.length) {
    if (raw[index] !== '"') {
      index += 1
      continue
    }

    const stringStart = index
    index += 1
    let escaped = false

    while (index < raw.length) {
      const char = raw[index]
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        break
      }
      index += 1
    }

    if (index >= raw.length) break

    const stringEnd = index
    let decoded: unknown
    try {
      decoded = JSON.parse(raw.slice(stringStart, stringEnd + 1))
    } catch {
      index += 1
      continue
    }

    if (decoded !== fieldName) {
      index += 1
      continue
    }

    let colon = stringEnd + 1
    while (/\s/.test(raw[colon] ?? "")) colon += 1
    if (raw[colon] !== ":") {
      index += 1
      continue
    }

    let valueStart = colon + 1
    while (/\s/.test(raw[valueStart] ?? "")) valueStart += 1

    let valueEnd = valueStart
    if (raw[valueEnd] === "-") valueEnd += 1
    const digitStart = valueEnd
    while (/\d/.test(raw[valueEnd] ?? "")) valueEnd += 1

    if (valueEnd === digitStart) {
      index += 1
      continue
    }

    const next = raw[valueEnd]
    if (
      next !== undefined &&
      !/\s/.test(next) &&
      next !== "," &&
      next !== "}" &&
      next !== "]"
    ) {
      index += 1
      continue
    }

    output += raw.slice(cursor, valueStart)
    output += JSON.stringify(raw.slice(valueStart, valueEnd))
    cursor = valueEnd
    index = valueEnd
  }

  return output + raw.slice(cursor)
}

export function parsePrzelewy24Json(raw: string): unknown {
  return JSON.parse(quoteIntegerField(raw, "orderId"))
}

export function serializePrzelewy24Json(value: unknown): string {
  const serialize = (entry: unknown, key?: string): string => {
    if (key === "orderId") {
      const normalized = normalizePrzelewy24OrderId(entry)
      if (!normalized) {
        throw new Error("PRZELEWY24_ORDER_ID_INVALID")
      }
      return normalized
    }

    if (entry === null) return "null"
    if (typeof entry === "string") return JSON.stringify(entry)
    if (typeof entry === "boolean") return entry ? "true" : "false"
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) {
        throw new Error("PRZELEWY24_JSON_NUMBER_INVALID")
      }
      return JSON.stringify(entry)
    }
    if (Array.isArray(entry)) {
      return `[${entry
        .map((child) => serialize(child))
        .join(",")}]`
    }
    if (entry && typeof entry === "object") {
      const fields = Object.entries(
        entry as Record<string, unknown>
      ).flatMap(([childKey, child]) =>
        child === undefined
          ? []
          : [
              `${JSON.stringify(childKey)}:${serialize(
                child,
                childKey
              )}`,
            ]
      )
      return `{${fields.join(",")}}`
    }

    throw new Error("PRZELEWY24_JSON_VALUE_INVALID")
  }

  return serialize(value)
}
