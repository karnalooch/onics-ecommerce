export const COMMERCE_MAX_BODY_BYTES = 128 * 1024

export class CommerceBodyTooLargeError extends Error {
  constructor() {
    super("COMMERCE_BODY_TOO_LARGE")
    this.name = "CommerceBodyTooLargeError"
  }
}

export class CommerceBodyInvalidError extends Error {
  constructor() {
    super("COMMERCE_BODY_INVALID")
    this.name = "CommerceBodyInvalidError"
  }
}

function assertBodyLimit(maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new RangeError("COMMERCE_BODY_LIMIT_INVALID")
  }
}

function rejectOversizedDeclaredBody(req: Request, maxBytes: number) {
  const value = req.headers.get("content-length")?.trim()
  if (!value || !/^\d+$/.test(value)) return

  const declared = Number(value)
  if (!Number.isSafeInteger(declared) || declared > maxBytes) {
    throw new CommerceBodyTooLargeError()
  }
}

export async function readCommerceBody(
  req: Request,
  maxBytes = COMMERCE_MAX_BODY_BYTES
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
        throw new CommerceBodyTooLargeError()
      }

      body += decoder.decode(value, { stream: true })
    }

    body += decoder.decode()
    return body
  } catch (error) {
    if (error instanceof CommerceBodyTooLargeError) throw error
    await reader.cancel().catch(() => undefined)
    throw new CommerceBodyInvalidError()
  } finally {
    reader.releaseLock()
  }
}

export async function readCommerceJson(
  req: Request,
  maxBytes = COMMERCE_MAX_BODY_BYTES
): Promise<unknown> {
  const rawBody = await readCommerceBody(req, maxBytes)

  try {
    return JSON.parse(rawBody)
  } catch {
    throw new CommerceBodyInvalidError()
  }
}
