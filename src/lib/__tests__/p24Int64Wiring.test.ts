import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Przelewy24 int64 boundary wiring", () => {
  it("parses payment and refund webhooks before native JSON can round orderId", () => {
    for (const routePath of [
      "src/app/api/webhooks/przelewy24/route.ts",
      "src/app/api/webhooks/przelewy24/refund/route.ts",
    ]) {
      const route = read(routePath)
      expect(route).toContain("readPaymentWebhookBody(")
      expect(route).toContain("parsePrzelewy24Json(")
      expect(route).not.toContain("readPaymentWebhookJson(")
      expect(route).toContain("normalizePrzelewy24OrderId(")
    }
  })

  it("uses exact P24 JSON parsing for provider responses carrying orderId", () => {
    const source = read("src/lib/przelewy24.ts")
    const transactionLookup = source.slice(
      source.indexOf("export async function getPrzelewy24TransactionBySessionId"),
      source.indexOf("export async function getPrzelewy24RefundDetails")
    )
    const refundLookup = source.slice(
      source.indexOf("export async function getPrzelewy24RefundDetails"),
      source.indexOf("export function validatePrzelewy24NotificationForOrder")
    )
    const refundRequest = source.slice(
      source.indexOf("export async function requestPrzelewy24Refund"),
      source.indexOf("export function validatePrzelewy24RefundNotificationForOrder")
    )

    expect(transactionLookup).toContain("parsePrzelewy24Json(raw)")
    expect(refundLookup).toContain("parsePrzelewy24Json(raw)")
    expect(refundRequest).toContain("parsePrzelewy24Json(raw)")
    expect(refundRequest).toContain("serializePrzelewy24Json({")
  })

  it("serializes verification orderId as an exact JSON integer", () => {
    const source = read("src/lib/przelewy24.ts")
    const start = source.indexOf(
      "export async function verifyPrzelewy24TransactionIdentity"
    )
    const end = source.indexOf(
      "export async function verifyPrzelewy24Transaction(",
      start
    )
    const flow = source.slice(start, end)

    expect(flow).toContain("serializePrzelewy24Json({")
    expect(flow).toContain("orderId: transaction.orderId")
    expect(flow).not.toContain("Number(transaction.orderId)")
  })
})
