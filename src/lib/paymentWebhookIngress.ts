export const PAYMENT_WEBHOOK_MAX_BODY_BYTES = 256 * 1024

export class PaymentWebhookBodyTooLargeError extends Error {
  constructor() {
    super("PAYMENT_WEBHOOK_BODY_TOO_LARGE")
    this.name = "PaymentWebhookBodyTooLargeError"
  }
}

export class PaymentWebhookInvalidBodyError extends Error {
  constructor() {
    super("PAYMENT_WEBHOOK_BODY_INVALID")
    this.name = "PaymentWebhookInvalidBodyError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("PAYMENT_WEBHOOK_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return

  const declared = Number(value)
  if (!Number.isSafeInteger(declared) || declared > maxBytes) {
    throw new PaymentWebhookBodyTooLargeError()
  }
}

export async function readPaymentWebhookBody(
  req: Request,
  maxBytes = PAYMENT_WEBHOOK_MAX_BODY_BYTES
) {
  assertBodyLimit(maxBytes)
  rejectOversizedDeclaredBody(req, maxBytes)

  if (!req.body) return ""

  const reader = req.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let body = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new PaymentWebhookBodyTooLargeError()
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return body
  } finally {
    reader.releaseLock()
  }
}

export async function readPaymentWebhookJson(
  req: Request,
  maxBytes = PAYMENT_WEBHOOK_MAX_BODY_BYTES
): Promise<unknown> {
  const rawBody = await readPaymentWebhookBody(req, maxBytes)

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new PaymentWebhookInvalidBodyError()
  }
}
