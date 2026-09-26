import { ORDER_IMPORT_MAX_BYTES } from "@/lib/orderImport"

export class OrderImportBodyTooLargeError extends Error {
  constructor() {
    super("ORDER_IMPORT_BODY_TOO_LARGE")
    this.name = "OrderImportBodyTooLargeError"
  }
}

export class OrderImportBodyInvalidError extends Error {
  constructor() {
    super("ORDER_IMPORT_BODY_INVALID")
    this.name = "OrderImportBodyInvalidError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("ORDER_IMPORT_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return

  const declared = Number(value)
  if (!Number.isSafeInteger(declared) || declared > maxBytes) {
    throw new OrderImportBodyTooLargeError()
  }
}

export async function readOrderImportBody(
  req: Request,
  maxBytes = ORDER_IMPORT_MAX_BYTES
) {
  assertBodyLimit(maxBytes)
  rejectOversizedDeclaredBody(req, maxBytes)

  if (!req.body) return ""

  const reader = req.body.getReader()
  const decoder = new TextDecoder("utf-8", { fatal: true })
  let bytesRead = 0
  let body = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      bytesRead += value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new OrderImportBodyTooLargeError()
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return body
  } catch (error) {
    if (error instanceof OrderImportBodyTooLargeError) throw error
    await reader.cancel().catch(() => undefined)
    throw new OrderImportBodyInvalidError()
  } finally {
    reader.releaseLock()
  }
}
