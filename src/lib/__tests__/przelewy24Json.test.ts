import { describe, expect, it } from "vitest"
import {
  normalizePrzelewy24OrderId,
  parsePrzelewy24Json,
  przelewy24OrderIdsEqual,
  serializePrzelewy24Json,
} from "@/lib/przelewy24Json"

describe("Przelewy24 int64 JSON boundary", () => {
  const maxInt64 = "9223372036854775807"

  it("preserves an int64 orderId before native JSON parsing can round it", () => {
    const parsed = parsePrzelewy24Json(
      `{"data":{"orderId":${maxInt64},"sessionId":"s1","statement":"literal \\\"orderId\\\":123"}}`
    ) as {
      data: {
        orderId: unknown
        sessionId: string
        statement: string
      }
    }

    expect(parsed.data.orderId).toBe(maxInt64)
    expect(parsed.data.statement).toBe('literal "orderId":123')
  })

  it("keeps ordinary safe orderIds as numbers for backward compatibility", () => {
    const parsed = parsePrzelewy24Json(
      '{"data":{"orderId":987654321,"sessionId":"s1"}}'
    ) as { data: { orderId: unknown } }

    expect(parsed.data.orderId).toBe(987654321)
  })

  it("normalizes legacy safe numbers and validates the signed int64 range", () => {
    expect(normalizePrzelewy24OrderId(987654321)).toBe("987654321")
    expect(normalizePrzelewy24OrderId(maxInt64)).toBe(maxInt64)
    expect(
      normalizePrzelewy24OrderId("9223372036854775808")
    ).toBeNull()
    expect(normalizePrzelewy24OrderId(Number.MAX_SAFE_INTEGER + 1))
      .toBeNull()
  })

  it("serializes nested orderId values as exact JSON integers, not strings", () => {
    const serialized = serializePrzelewy24Json({
      requestId: "request-1",
      refunds: [
        {
          orderId: maxInt64,
          sessionId: "session-1",
          amount: 12345,
        },
      ],
    })

    expect(serialized).toContain(
      `"orderId":${maxInt64}`
    )
    expect(serialized).not.toContain(
      `"orderId":"${maxInt64}"`
    )
  })

  it("compares canonical int64 identities across legacy number and string storage", () => {
    expect(przelewy24OrderIdsEqual(987654321, "987654321")).toBe(true)
    expect(przelewy24OrderIdsEqual(maxInt64, maxInt64)).toBe(true)
    expect(przelewy24OrderIdsEqual(maxInt64, "9223372036854775806"))
      .toBe(false)
  })
})
