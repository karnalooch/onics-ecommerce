import { describe, expect, it } from "vitest"
import {
  PaymentWebhookBodyTooLargeError,
  PaymentWebhookInvalidBodyError,
  readPaymentWebhookBody,
  readPaymentWebhookJson,
} from "@/lib/paymentWebhookIngress"

function request(
  body: string,
  headers: Record<string, string> = {}
) {
  return new Request("https://shop.example.com/api/webhook", {
    method: "POST",
    headers,
    body,
  })
}

describe("payment webhook ingress", () => {
  it("reads a body whose actual UTF-8 byte length is within the limit", async () => {
    await expect(
      readPaymentWebhookBody(request("ąą"), 4)
    ).resolves.toBe("ąą")
  })

  it("rejects an oversized declared Content-Length before reading the body", async () => {
    await expect(
      readPaymentWebhookBody(
        request("{}", { "content-length": "999" }),
        16
      )
    ).rejects.toBeInstanceOf(PaymentWebhookBodyTooLargeError)
  })

  it("rejects an oversized streamed body even when Content-Length understates it", async () => {
    await expect(
      readPaymentWebhookBody(
        request("12345", { "content-length": "1" }),
        4
      )
    ).rejects.toBeInstanceOf(PaymentWebhookBodyTooLargeError)
  })

  it("parses bounded JSON and fails closed on malformed JSON", async () => {
    await expect(
      readPaymentWebhookJson(request('{"ok":true}'), 32)
    ).resolves.toEqual({ ok: true })

    await expect(
      readPaymentWebhookJson(request("{"), 32)
    ).rejects.toBeInstanceOf(PaymentWebhookInvalidBodyError)
  })

  it("rejects invalid body limits as developer configuration errors", async () => {
    await expect(
      readPaymentWebhookBody(request("{}"), 0)
    ).rejects.toThrow("PAYMENT_WEBHOOK_BODY_LIMIT_INVALID")
  })
})
